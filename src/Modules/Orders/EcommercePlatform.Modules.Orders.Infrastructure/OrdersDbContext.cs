using EcommercePlatform.BuildingBlocks.Application;
using EcommercePlatform.BuildingBlocks.Infrastructure;
using EcommercePlatform.Modules.Orders.Application;
using EcommercePlatform.Modules.Orders.Domain;
using Microsoft.EntityFrameworkCore;

namespace EcommercePlatform.Modules.Orders.Infrastructure;
public sealed class OrdersDbContext(DbContextOptions<OrdersDbContext> options) : ModuleDbContext(options)
{
    public DbSet<Order> Orders => Set<Order>();

    protected override void OnModelCreating(ModelBuilder m)
    {
        m.HasDefaultSchema("orders");
        m.Entity<Order>(b =>
        {
            b.HasKey(x => x.Id);
            b.HasIndex(x => new { x.CustomerId, x.CheckoutKey }).IsUnique();
            b.Property(x => x.RequestHash).HasMaxLength(64);
            b.Property(x => x.Status).HasConversion<string>();
            b.OwnsOne(x => x.Total);
            b.OwnsOne(x => x.Shipping);
            b.HasMany(x => x.Lines).WithOne().HasForeignKey(x => x.OrderId);
            b.Navigation(x => x.Lines).UsePropertyAccessMode(PropertyAccessMode.Field);
        });
        m.Entity<OrderLine>(b =>
        {
            b.HasKey(x => x.Id);
            b.OwnsOne(x => x.UnitPrice);
            b.HasIndex(x => new { x.OrderId, x.ProductId }).IsUnique();
        });
        base.OnModelCreating(m);
    }
}

internal sealed class OrderStore(OrdersDbContext db) : IOrderStore
{
    public Task<Order?> Find(Guid id, CancellationToken ct) => db.Orders.Include(x => x.Lines).SingleOrDefaultAsync(x => x.Id == id, ct);
    public Task<Order?> FindCheckout(Guid customerId, Guid key, CancellationToken ct) => db.Orders.Include(x => x.Lines).SingleOrDefaultAsync(x => x.CustomerId == customerId && x.CheckoutKey == key, ct);
    public void Add(Order order) => db.Orders.Add(order);
    public async Task<Page<OrderDto>> List(OrderStatus? status, int page, int size, CancellationToken ct)
    {
        var q = db.Orders.AsNoTracking().AsQueryable();
        if (status is not null)
            q = q.Where(x => x.Status == status);
        var total = await q.CountAsync(ct);
        var orders = await q.OrderByDescending(x => EF.Property<DateTimeOffset>(x, "CreatedAtUtc")).ThenBy(x => x.Id).Skip((page - 1) * size).Take(size).Include(x => x.Lines).ToListAsync(ct);
        return new(orders.Select(OrderMapping.Dto).ToArray(), page, size, total);
    }
}
