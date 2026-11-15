using EcommercePlatform.BuildingBlocks.Infrastructure;
using EcommercePlatform.Modules.Cart.Application;
using EcommercePlatform.Modules.Cart.Domain;
using Microsoft.EntityFrameworkCore;

namespace EcommercePlatform.Modules.Cart.Infrastructure;
public sealed class CartDbContext(DbContextOptions<CartDbContext> options) : ModuleDbContext(options)
{
    public DbSet<Basket> Baskets => Set<Basket>();

    protected override void OnModelCreating(ModelBuilder m)
    {
        m.HasDefaultSchema("cart");
        m.Entity<Basket>(b =>
        {
            b.HasKey(x => x.Id);
            b.HasIndex(x => x.CustomerId).IsUnique();
            b.HasMany(x => x.Lines).WithOne().HasForeignKey(x => x.BasketId);
            b.Navigation(x => x.Lines).UsePropertyAccessMode(PropertyAccessMode.Field);
        });
        m.Entity<BasketLine>().HasIndex(x => new { x.BasketId, x.ProductId }).IsUnique();
        base.OnModelCreating(m);
    }
}

internal sealed class CartStore(CartDbContext db) : ICartStore
{
    public Task<Basket?> Find(Guid id, CancellationToken ct) => db.Baskets.Include(x => x.Lines).SingleOrDefaultAsync(x => x.CustomerId == id, ct);
    public void Add(Basket entity) => db.Baskets.Add(entity);
}
