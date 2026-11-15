using EcommercePlatform.BuildingBlocks.Application;
using EcommercePlatform.BuildingBlocks.Infrastructure;
using EcommercePlatform.Modules.Payments.Application;
using EcommercePlatform.Modules.Payments.Domain;
using Microsoft.EntityFrameworkCore;

namespace EcommercePlatform.Modules.Payments.Infrastructure;
public sealed class PaymentsDbContext(DbContextOptions<PaymentsDbContext> options) : ModuleDbContext(options)
{
    public DbSet<Payment> Payments => Set<Payment>();

    protected override void OnModelCreating(ModelBuilder m)
    {
        m.HasDefaultSchema("payments");
        m.Entity<Payment>(b =>
        {
            b.HasKey(x => x.Id);
            b.HasIndex(x => x.OrderId).IsUnique();
            b.Property(x => x.SettlementReference).HasMaxLength(200);
            b.HasIndex(x => x.SettlementReference).IsUnique();
            b.Property(x => x.RefundReference).HasMaxLength(200);
            b.HasIndex(x => x.RefundReference).IsUnique();
            b.OwnsOne(x => x.Amount);
        });
        base.OnModelCreating(m);
    }
}

internal sealed class PaymentStore(PaymentsDbContext db) : IPaymentStore
{
    public Task<Payment?> Find(Guid orderId, CancellationToken ct) => db.Payments.SingleOrDefaultAsync(x => x.OrderId == orderId, ct);
    public void Add(Payment payment) => db.Payments.Add(payment);
    public async Task<Page<AdminPaymentDto>> List(int page, int size, CancellationToken ct)
    {
        var total = await db.Payments.CountAsync(ct);
        var payments = await db.Payments.AsNoTracking().OrderByDescending(x => x.SettledAt).ThenBy(x => x.Id).Skip((page - 1) * size).Take(size).ToListAsync(ct);
        return new(payments.Select(AdminPaymentDto.From).ToArray(), page, size, total);
    }
}
