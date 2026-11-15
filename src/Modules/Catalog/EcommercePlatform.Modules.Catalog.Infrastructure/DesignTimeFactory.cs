using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace EcommercePlatform.Modules.Catalog.Infrastructure;
public sealed class DesignTimeFactory : IDesignTimeDbContextFactory<CatalogDbContext>
{
    public CatalogDbContext CreateDbContext(string[] args)
    {
        var connection = Environment.GetEnvironmentVariable("ConnectionStrings__Database") ?? "Host=localhost;Database=ecommerce;Username=postgres";
        return new(new DbContextOptionsBuilder<CatalogDbContext>().UseNpgsql(connection, o => o.MigrationsHistoryTable("__EFMigrationsHistory", "catalog")).Options);
    }
}
