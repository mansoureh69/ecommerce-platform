using EcommercePlatform.BuildingBlocks.Application;
using EcommercePlatform.BuildingBlocks.Domain;
using EcommercePlatform.Modules.Catalog.Application;
using EcommercePlatform.Modules.Pricing.Domain;
using MediatR;

namespace EcommercePlatform.Modules.Pricing.Application;
public interface IPricingStore
{
    Task<ProductPrice?> Find(Guid productId, CancellationToken ct);
    void Add(ProductPrice price);
}

public interface IPricing
{
    Task<Money> Quote(Guid productId, CancellationToken ct);
}

public sealed class PricingService(IPricingStore store) : IPricing
{
    public async Task<Money> Quote(Guid productId, CancellationToken ct) => (await store.Find(productId, ct) ?? throw new ConflictException("Product has no price.")).Price;
}

public sealed record SetPrice(Guid ProductId, decimal Amount, string Currency) : ICommand<Money>;
public sealed record GetPrice(Guid ProductId) : IRequest<Money>;
public sealed class PricingHandlers(IPricingStore store, ICatalog catalog, IPricing pricing) : IRequestHandler<SetPrice, Money>, IRequestHandler<GetPrice, Money>
{
    public async Task<Money> Handle(SetPrice r, CancellationToken ct)
    {
        await catalog.RequireProduct(r.ProductId, ct);
        var money = new Money(r.Amount, r.Currency);
        var p = await store.Find(r.ProductId, ct);
        if (p is null)
            store.Add(new ProductPrice(r.ProductId, money));
        else
            p.Set(money);
        return money;
    }

    public async Task<Money> Handle(GetPrice r, CancellationToken ct)
    {
        await catalog.RequireProduct(r.ProductId, ct);
        return await pricing.Quote(r.ProductId, ct);
    }
}
