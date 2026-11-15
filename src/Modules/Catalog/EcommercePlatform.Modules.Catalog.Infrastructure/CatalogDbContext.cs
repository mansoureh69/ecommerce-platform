using EcommercePlatform.BuildingBlocks.Application;
using EcommercePlatform.BuildingBlocks.Infrastructure;
using EcommercePlatform.Modules.Catalog.Application;
using EcommercePlatform.Modules.Catalog.Domain;
using Microsoft.EntityFrameworkCore;

namespace EcommercePlatform.Modules.Catalog.Infrastructure;
public sealed class CatalogDbContext(DbContextOptions<CatalogDbContext> options) : ModuleDbContext(options)
{
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Category> Categories => Set<Category>();

    protected override void OnModelCreating(ModelBuilder m)
    {
        m.HasDefaultSchema("catalog");
        m.Entity<Product>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.Sku).HasMaxLength(64);
            b.HasIndex(x => x.Sku).IsUnique();
            b.Property(x => x.Name).HasMaxLength(200);
            b.Property(x => x.Published).HasDefaultValue(true);
            b.HasOne<Category>().WithMany().HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);
            b.HasMany(x => x.Variants).WithOne().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
            b.Navigation(x => x.Variants).UsePropertyAccessMode(PropertyAccessMode.Field);
            b.HasMany(x => x.Attributes).WithOne().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
            b.Navigation(x => x.Attributes).UsePropertyAccessMode(PropertyAccessMode.Field);
            b.HasMany(x => x.Images).WithOne().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
            b.Navigation(x => x.Images).UsePropertyAccessMode(PropertyAccessMode.Field);
        });
        m.Entity<Category>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.Name).HasMaxLength(100);
            b.Property(x => x.Description).HasMaxLength(500);
            b.HasIndex(x => x.Name).IsUnique();
        });
        m.Entity<ProductVariant>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.Sku).HasMaxLength(64);
            b.HasIndex(x => x.Sku).IsUnique();
            b.HasMany(x => x.Attributes).WithOne().HasForeignKey(x => x.VariantId).OnDelete(DeleteBehavior.Cascade);
            b.Navigation(x => x.Attributes).UsePropertyAccessMode(PropertyAccessMode.Field);
        });
        m.Entity<ProductAttribute>(b =>
        {
            b.HasKey(x => x.Id);
            b.HasIndex(x => new { x.ProductId, x.Name }).IsUnique();
            b.Property(x => x.Name).HasMaxLength(100);
            b.Property(x => x.Value).HasMaxLength(500);
        });
        m.Entity<VariantAttribute>(b =>
        {
            b.HasKey(x => x.Id);
            b.HasIndex(x => new { x.VariantId, x.Name }).IsUnique();
            b.Property(x => x.Name).HasMaxLength(100);
            b.Property(x => x.Value).HasMaxLength(500);
        });
        m.Entity<ProductImage>(b =>
        {
            b.HasKey(x => x.Id);
            b.HasIndex(x => x.StorageKey).IsUnique();
            b.HasIndex(x => x.ThumbnailKey).IsUnique();
            b.HasIndex(x => new { x.ProductId, x.DisplayOrder });
            b.Property(x => x.StorageKey).HasMaxLength(500);
            b.Property(x => x.ThumbnailKey).HasMaxLength(500);
            b.Property(x => x.AltText).HasMaxLength(250);
        });
        base.OnModelCreating(m);
    }
}

internal sealed class CatalogStore(CatalogDbContext db) : ICatalogStore
{
    private IQueryable<Product> Products(bool tracking = true)
    {
        var q = tracking ? db.Products : db.Products.AsNoTracking();
        return q.Include(x => x.Attributes).Include(x => x.Variants).ThenInclude(x => x.Attributes).Include(x => x.Images);
    }

    public Task<Product?> Find(Guid id, CancellationToken ct) => Products().SingleOrDefaultAsync(x => x.Id == id, ct);
    public Task<Category?> FindCategory(Guid id, CancellationToken ct) => db.Categories.SingleOrDefaultAsync(x => x.Id == id, ct);
    public Task<bool> CategoryExists(Guid id, CancellationToken ct) => db.Categories.AnyAsync(x => x.Id == id, ct);
    public async Task<bool> SkuExists(string sku, Guid? product, Guid? variant, CancellationToken ct)
    {
        var normalized = sku.Trim().ToUpperInvariant();
        return await db.Products.AnyAsync(x => x.Sku == normalized && x.Id != product, ct) || await db.Set<ProductVariant>().AnyAsync(x => x.Sku == normalized && x.Id != variant, ct);
    }

    public void Add(Product p) => db.Products.Add(p);
    public void Add(Category c) => db.Categories.Add(c);
    public async Task<IReadOnlyList<CategoryDto>> Categories(CancellationToken ct) => await db.Categories.AsNoTracking().OrderBy(x => x.Name).Select(x => new CategoryDto(x.Id, x.Name, x.Description)).ToListAsync(ct);
    public async Task<Page<ProductDto>> List(ProductSearch search, bool administration, CancellationToken ct)
    {
        var q = db.Products.AsNoTracking().AsQueryable();
        if (!administration)
            q = q.Where(x => x.Active && x.Published);
        if (search.Active is not null)
            q = q.Where(x => x.Active == search.Active);
        if (search.Published is not null)
            q = q.Where(x => x.Published == search.Published);
        if (search.CategoryId is not null)
            q = q.Where(x => x.CategoryId == search.CategoryId);
        if (!string.IsNullOrWhiteSpace(search.Search))
        {
            var term = search.Search.Trim();
            q = q.Where(x => EF.Functions.ILike(x.Name, $"%{term}%") || EF.Functions.ILike(x.Sku, $"%{term}%"));
        }

        var total = await q.CountAsync(ct);
        IOrderedQueryable<Product> ordered = search.Sort switch
        {
            "name-desc" => q.OrderByDescending(x => x.Name),
            "sku" => q.OrderBy(x => x.Sku),
            "newest" => q.OrderByDescending(x => EF.Property<DateTimeOffset>(x, "CreatedAtUtc")),
            _ => q.OrderBy(x => x.Name)};
        var products = await ordered.ThenBy(x => x.Id).Skip((search.Page - 1) * search.Size).Take(search.Size).Include(x => x.Attributes).Include(x => x.Variants).ThenInclude(x => x.Attributes).Include(x => x.Images).ToListAsync(ct);
        return new(products.Select(x => Mapping.Product(x, null)).ToArray(), search.Page, search.Size, total);
    }
}
