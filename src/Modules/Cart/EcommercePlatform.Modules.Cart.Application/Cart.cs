using EcommercePlatform.BuildingBlocks.Application;
using EcommercePlatform.BuildingBlocks.Domain;
using EcommercePlatform.Modules.Cart.Domain;
using EcommercePlatform.Modules.Catalog.Application;
using MediatR;

namespace EcommercePlatform.Modules.Cart.Application;
public sealed record CartLineDto(Guid ProductId, int Quantity);
public sealed record CartDto(Guid Version, IReadOnlyList<CartLineDto> Lines);
public interface ICartStore
{
    Task<Basket?> Find(Guid customerId, CancellationToken ct);
    void Add(Basket basket);
}

public interface ICart
{
    Task<CartDto> Read(Guid customerId, CancellationToken ct);
    Task Clear(Guid customerId, Guid version, CancellationToken ct);
}

public sealed class CartService(ICartStore store) : ICart
{
    public async Task<CartDto> Read(Guid customerId, CancellationToken ct)
    {
        var b = await store.Find(customerId, ct);
        return b is null ? new(Guid.Empty, []) : new(b.Version, b.Lines.Select(x => new CartLineDto(x.ProductId, x.Quantity)).ToArray());
    }

    public async Task Clear(Guid customerId, Guid version, CancellationToken ct)
    {
        var b = await store.Find(customerId, ct) ?? throw new ConflictException("Cart is empty.");
        if (b.Version != version)
            throw new ConflictException("Cart changed; reload before checkout.");
        b.Clear();
    }
}

public sealed record SetCartLine(Guid ProductId, int Quantity) : ICommand<CartDto>;
public sealed record GetCart : IRequest<CartDto>;
public sealed class CartHandlers(ICartStore store, ICart cart, ICatalog catalog, ICurrentUser user) : IRequestHandler<SetCartLine, CartDto>, IRequestHandler<GetCart, CartDto>
{
    public async Task<CartDto> Handle(SetCartLine r, CancellationToken ct)
    {
        var id = user.RequireId();
        if (r.Quantity != 0)
            await catalog.RequireProduct(r.ProductId, ct);
        var b = await store.Find(id, ct);
        if (b is null)
        {
            b = new Basket(id);
            store.Add(b);
        }

        b.Set(r.ProductId, r.Quantity);
        return new(b.Version, b.Lines.Select(x => new CartLineDto(x.ProductId, x.Quantity)).ToArray());
    }

    public Task<CartDto> Handle(GetCart r, CancellationToken ct) => cart.Read(user.RequireId(), ct);
}
