using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace EcommercePlatform.Modules.Pricing.Infrastructure;
public sealed class DesignTimeFactory : IDesignTimeDbContextFactory<PricingDbContext>
{
    public PricingDbContext CreateDbContext(string[] args)
    {
        var connection = Environment.GetEnvironmentVariable("ConnectionStrings__Database") ?? "Host=localhost;Database=ecommerce;Username=postgres";
        return new(new DbContextOptionsBuilder<PricingDbContext>().UseNpgsql(connection, o => o.MigrationsHistoryTable("__EFMigrationsHistory", "pricing")).Options);
    }
}
