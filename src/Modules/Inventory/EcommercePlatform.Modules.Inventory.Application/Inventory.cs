using EcommercePlatform.BuildingBlocks.Application;
using EcommercePlatform.Modules.Inventory.Domain;
using EcommercePlatform.Modules.Catalog.Application;
using MediatR;

namespace EcommercePlatform.Modules.Inventory.Application;
public interface IInventoryStore
{
    Task<Stock?> Find(Guid productId, CancellationToken ct);
    void Add(Stock stock);
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
