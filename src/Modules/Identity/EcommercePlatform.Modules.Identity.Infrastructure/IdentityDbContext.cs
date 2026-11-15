using EcommercePlatform.BuildingBlocks.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace EcommercePlatform.Modules.Identity.Infrastructure;
public sealed class ApplicationUser : IdentityUser<Guid>;
public sealed class IdentityDbContext(DbContextOptions<IdentityDbContext> options) : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>(options), IModuleSession
{
    public DbContext Context => this;

    protected override void OnModelCreating(ModelBuilder m)
    {
        base.OnModelCreating(m);
        m.HasDefaultSchema("identity");
        m.Entity<ApplicationUser>().HasIndex(x => x.NormalizedEmail).IsUnique();
    }
}
