using EcommercePlatform.BuildingBlocks.Application;
using EcommercePlatform.Modules.Inventory.Domain;
using EcommercePlatform.Modules.Catalog.Application;
using FluentValidation;
using MediatR;

namespace EcommercePlatform.Modules.Inventory.Application;
public interface IInventoryStore
{
    Task<Stock?> Find(Guid productId, CancellationToken ct);
    void Add(Stock stock);
    Task<Page<StockDto>> List(int page, int size, CancellationToken ct);
}

public interface IInventory
{
    Task Reserve(Guid productId, Guid orderId, int quantity, CancellationToken ct);
    Task Release(Guid productId, Guid orderId, CancellationToken ct);
    Task Consume(Guid productId, Guid orderId, CancellationToken ct);
}

public sealed class InventoryService(IInventoryStore store) : IInventory
{
    private async Task<Stock> Find(Guid id, CancellationToken ct) => await store.Find(id, ct) ?? throw new EcommercePlatform.BuildingBlocks.Domain.ConflictException("Stock is not configured.");
    public async Task Reserve(Guid productId, Guid orderId, int quantity, CancellationToken ct) => (await Find(productId, ct)).Reserve(orderId, quantity);
    public async Task Release(Guid productId, Guid orderId, CancellationToken ct) => (await Find(productId, ct)).Release(orderId);
    public async Task Consume(Guid productId, Guid orderId, CancellationToken ct) => (await Find(productId, ct)).Consume(orderId);
}

public sealed record ReservationDto(Guid OrderId, int Quantity, string State);
public sealed record StockDto(Guid ProductId, int Available, int Reserved, int Consumed, IReadOnlyList<ReservationDto> Reservations)
{
    public static StockDto From(Stock s) => new(s.ProductId, s.Available, s.Reservations.Where(x => x.State == "Reserved").Sum(x => x.Quantity), s.Reservations.Where(x => x.State == "Consumed").Sum(x => x.Quantity), s.Reservations.Select(x => new ReservationDto(x.OrderId, x.Quantity, x.State)).ToArray());
}

public sealed record AdminListStock(int Page = 1, int Size = 20) : IRequest<Page<StockDto>>;
public sealed record AdminGetStock(Guid ProductId) : IRequest<StockDto>;
public sealed class AdminListStockValidator : AbstractValidator<AdminListStock>
{
    public AdminListStockValidator()
    {
        RuleFor(x => x.Page).InclusiveBetween(1, 100000);
        RuleFor(x => x.Size).InclusiveBetween(1, 100);
    }
}

public sealed class AdminInventoryHandlers(IInventoryStore store, ICatalog catalog) : IRequestHandler<AdminListStock, Page<StockDto>>, IRequestHandler<AdminGetStock, StockDto>
{
    public Task<Page<StockDto>> Handle(AdminListStock r, CancellationToken ct) => store.List(r.Page, r.Size, ct);
    public async Task<StockDto> Handle(AdminGetStock r, CancellationToken ct)
    {
        await catalog.RequireProduct(r.ProductId, ct);
        var s = await store.Find(r.ProductId, ct);
        return s is null ? new(r.ProductId, 0, 0, 0, []) : StockDto.From(s);
    }
}

public sealed record ReceiveStock(Guid ProductId, int Quantity) : ICommand<int>;
public sealed record GetStock(Guid ProductId) : IRequest<int>;
public sealed class InventoryHandlers(IInventoryStore store, ICatalog catalog) : IRequestHandler<ReceiveStock, int>, IRequestHandler<GetStock, int>
{
    public async Task<int> Handle(ReceiveStock r, CancellationToken ct)
    {
        await catalog.RequireProduct(r.ProductId, ct);
        var s = await store.Find(r.ProductId, ct);
        if (s is null)
        {
            s = new Stock(r.ProductId);
            store.Add(s);
        }

        s.Receive(r.Quantity);
        return s.Available;
    }

    public async Task<int> Handle(GetStock r, CancellationToken ct) => (await store.Find(r.ProductId, ct))?.Available ?? 0;
}
