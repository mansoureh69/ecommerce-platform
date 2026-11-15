using EcommercePlatform.BuildingBlocks.Infrastructure;
using EcommercePlatform.Modules.Pricing.Application;
using EcommercePlatform.Modules.Pricing.Domain;
using Microsoft.EntityFrameworkCore;

namespace EcommercePlatform.Modules.Pricing.Infrastructure;
public sealed class PricingDbContext(DbContextOptions<PricingDbContext> options) : ModuleDbContext(options)
{
    public DbSet<ProductPrice> Prices => Set<ProductPrice>();

    protected override void OnModelCreating(ModelBuilder m)
    {
        m.HasDefaultSchema("pricing");
        m.Entity<ProductPrice>(b =>
        {
            b.HasKey(x => x.Id);
            b.HasIndex(x => x.ProductId).IsUnique();
            b.OwnsOne(x => x.Price, m =>
            {
                m.Property(x => x.Amount).HasPrecision(19, 3);
                m.Property(x => x.Currency).HasMaxLength(3);
            });
        });
        base.OnModelCreating(m);
    }
}

internal sealed class PricingStore(PricingDbContext db) : IPricingStore
{
    public Task<ProductPrice?> Find(Guid id, CancellationToken ct) => db.Prices.SingleOrDefaultAsync(x => x.ProductId == id, ct);
    public void Add(ProductPrice entity) => db.Prices.Add(entity);
}
