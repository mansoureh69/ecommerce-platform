using EcommercePlatform.BuildingBlocks.Application;
using EcommercePlatform.BuildingBlocks.Infrastructure;
using EcommercePlatform.Modules.Inventory.Application;
using EcommercePlatform.Modules.Inventory.Domain;
using Microsoft.EntityFrameworkCore;

namespace EcommercePlatform.Modules.Inventory.Infrastructure;
public sealed class InventoryDbContext(DbContextOptions<InventoryDbContext> options) : ModuleDbContext(options)
{
    public DbSet<Stock> Stocks => Set<Stock>();

    protected override void OnModelCreating(ModelBuilder m)
    {
        m.HasDefaultSchema("inventory");
        m.Entity<Stock>(b =>
        {
            b.HasKey(x => x.Id);
            b.HasIndex(x => x.ProductId).IsUnique();
            b.HasMany(x => x.Reservations).WithOne().HasForeignKey(x => x.StockId);
            b.Navigation(x => x.Reservations).UsePropertyAccessMode(PropertyAccessMode.Field);
        });
        m.Entity<Reservation>().HasIndex(x => new { x.StockId, x.OrderId }).IsUnique();
        base.OnModelCreating(m);
    }
}

internal sealed class InventoryStore(InventoryDbContext db) : IInventoryStore
{
    public Task<Stock?> Find(Guid id, CancellationToken ct) => db.Stocks.Include(x => x.Reservations).SingleOrDefaultAsync(x => x.ProductId == id, ct);
    public void Add(Stock entity) => db.Stocks.Add(entity);
    public async Task<Page<StockDto>> List(int page, int size, CancellationToken ct)
    {
        var total = await db.Stocks.CountAsync(ct);
        var stocks = await db.Stocks.AsNoTracking().OrderBy(x => x.ProductId).Skip((page - 1) * size).Take(size).Include(x => x.Reservations).ToListAsync(ct);
        return new(stocks.Select(StockDto.From).ToArray(), page, size, total);
    }
}
