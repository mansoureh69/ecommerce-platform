using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using EcommercePlatform.BuildingBlocks.Application;
using EcommercePlatform.BuildingBlocks.Domain;
using EcommercePlatform.Modules.Orders.Domain;
using EcommercePlatform.Modules.Catalog.Application;
using EcommercePlatform.Modules.Cart.Application;
using EcommercePlatform.Modules.Inventory.Application;
using EcommercePlatform.Modules.Pricing.Application;
using FluentValidation;
using MediatR;

namespace EcommercePlatform.Modules.Orders.Application;
public sealed record AddressInput(string Recipient, string Street, string City, string PostalCode, string Country);
public sealed record Checkout(Guid IdempotencyKey, Guid CartVersion, AddressInput Shipping) : ICommand<OrderDto>;
public sealed record GetOrder(Guid OrderId) : IRequest<OrderDto>;
public sealed record CancelOrder(Guid OrderId) : ICommand<OrderDto>;
public sealed record FulfillOrder(Guid OrderId, bool Delivered) : ICommand<OrderDto>;
public sealed record OrderLineDto(Guid ProductId, string Name, Money UnitPrice, int Quantity);
public sealed record OrderDto(Guid Id, Guid CustomerId, string Status, Money Total, IReadOnlyList<OrderLineDto> Lines);
public interface IOrderStore
{
    Task<Order?> Find(Guid id, CancellationToken ct);
    Task<Order?> FindCheckout(Guid customerId, Guid key, CancellationToken ct);
    void Add(Order order);
}

public interface IOrders
{
    Task<OrderDto> ReadForSettlement(Guid id, CancellationToken ct);
    Task MarkPaid(Guid id, Money amount, CancellationToken ct);
    Task Refund(Guid id, CancellationToken ct);
}

public static class OrderMapping
{
    public static OrderDto Dto(Order o) => new(o.Id, o.CustomerId, o.Status.ToString(), o.Total, o.Lines.Select(x => new OrderLineDto(x.ProductId, x.Name, x.UnitPrice, x.Quantity)).ToArray());
}

public sealed class OrdersService(IOrderStore store) : IOrders
{
    public async Task<OrderDto> ReadForSettlement(Guid id, CancellationToken ct) => OrderMapping.Dto(await store.Find(id, ct) ?? throw new KeyNotFoundException());
    public async Task MarkPaid(Guid id, Money amount, CancellationToken ct)
    {
        var o = await store.Find(id, ct) ?? throw new KeyNotFoundException();
        if (o.Total != amount)
            throw new ConflictException("Settlement amount must equal the order total.");
        o.MarkPaid();
    }

    public async Task Refund(Guid id, CancellationToken ct) => (await store.Find(id, ct) ?? throw new KeyNotFoundException()).Refund();
}

public sealed class CheckoutValidator : AbstractValidator<Checkout>
{
    public CheckoutValidator()
    {
        RuleFor(x => x.IdempotencyKey).NotEmpty();
        RuleFor(x => x.CartVersion).NotEmpty();
        RuleFor(x => x.Shipping).NotNull();
    }
}

public sealed class OrderHandlers(IOrderStore store, ICart cart, ICatalog catalog, IPricing pricing, IInventory inventory, ICurrentUser user) : IRequestHandler<Checkout, OrderDto>, IRequestHandler<GetOrder, OrderDto>, IRequestHandler<CancelOrder, OrderDto>, IRequestHandler<FulfillOrder, OrderDto>
{
    public async Task<OrderDto> Handle(Checkout r, CancellationToken ct)
    {
        var customer = user.RequireId();
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(new { r.CartVersion, r.Shipping }))));
        var existing = await store.FindCheckout(customer, r.IdempotencyKey, ct);
        if (existing is not null)
        {
            if (existing.RequestHash != hash)
                throw new ConflictException("Idempotency key was already used for different checkout data.");
            return OrderMapping.Dto(existing);
        }

        var basket = await cart.Read(customer, ct);
        if (basket.Version != r.CartVersion)
            throw new ConflictException("Cart changed; reload before checkout.");
        var snapshots = new List<LineSnapshot>();
        foreach (var line in basket.Lines.OrderBy(x => x.ProductId))
        {
            var p = await catalog.RequireProduct(line.ProductId, ct);
            snapshots.Add(new(p.Id, p.Name, await pricing.Quote(p.Id, ct), line.Quantity));
        }

        var a = r.Shipping;
        var order = new Order(customer, r.IdempotencyKey, hash, new ShippingAddress(a.Recipient, a.Street, a.City, a.PostalCode, a.Country), snapshots);
        foreach (var line in order.Lines)
            await inventory.Reserve(line.ProductId, order.Id, line.Quantity, ct);
        store.Add(order);
        await cart.Clear(customer, r.CartVersion, ct);
        return OrderMapping.Dto(order);
    }

    private async Task<Order> Owned(Guid id, CancellationToken ct)
    {
        var o = await store.Find(id, ct) ?? throw new KeyNotFoundException();
        if (o.CustomerId != user.RequireId())
            throw new KeyNotFoundException();
        return o;
    }

    public async Task<OrderDto> Handle(GetOrder r, CancellationToken ct) => OrderMapping.Dto(await Owned(r.OrderId, ct));
    public async Task<OrderDto> Handle(CancelOrder r, CancellationToken ct)
    {
        var o = await Owned(r.OrderId, ct);
        if (o.Status != OrderStatus.Cancelled)
            o.Cancel();
        return OrderMapping.Dto(o);
    }

    public async Task<OrderDto> Handle(FulfillOrder r, CancellationToken ct)
    {
        var o = await store.Find(r.OrderId, ct) ?? throw new KeyNotFoundException();
        if (r.Delivered)
            o.Deliver();
        else
            o.Ship();
        return OrderMapping.Dto(o);
    }
}

// Real transactional domain-event consumers, unlike the source's log-only dispatcher.
public sealed class ReservationLifecycle(IOrderStore store, IInventory inventory) : INotificationHandler<DomainNotification<OrderPaid>>, INotificationHandler<DomainNotification<OrderCancelled>>, INotificationHandler<DomainNotification<OrderRefunded>>
{
    public async Task Handle(DomainNotification<OrderPaid> n, CancellationToken ct)
    {
        var o = await store.Find(n.Event.OrderId, ct) ?? throw new KeyNotFoundException();
        foreach (var line in o.Lines)
            await inventory.Consume(line.ProductId, o.Id, ct);
    }

    public async Task Handle(DomainNotification<OrderCancelled> n, CancellationToken ct)
    {
        var o = await store.Find(n.Event.OrderId, ct) ?? throw new KeyNotFoundException();
        foreach (var line in o.Lines)
            await inventory.Release(line.ProductId, o.Id, ct);
    }

    // Refunds are financial only. Received physical returns must be restocked explicitly.
    public Task Handle(DomainNotification<OrderRefunded> n, CancellationToken ct) => Task.CompletedTask;
}
