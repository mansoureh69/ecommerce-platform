using EcommercePlatform.BuildingBlocks.Application;
using EcommercePlatform.Modules.Catalog.Application;
using EcommercePlatform.Modules.Catalog.Domain;

namespace EcommercePlatform.UnitTests;
public sealed class CatalogMediaTests
{
    [Fact]
    public void Product_enforces_variant_attribute_publication_and_image_rules()
    {
        var product = new Product("sku", "Product", "", Guid.NewGuid());
        product.SetAttributes(new Dictionary<string, string> { { "Material", "Steel" } });
        var variant = product.AddVariant("variant", "Large", new Dictionary<string, string> { { "Size", "L" } });
        Assert.Equal("VARIANT", variant.Sku);
        product.Deactivate();
        Assert.False(product.Published);
        Assert.Throws<EcommercePlatform.BuildingBlocks.Domain.ConflictException>(product.Publish);
        product.Activate();
        product.Publish();
        var first = product.AddImage(Guid.NewGuid(), "products/a/image.webp", "products/a/thumb.webp", "image/webp", 10, 100, 100, "Front");
        var second = product.AddImage(Guid.NewGuid(), "products/b/image.webp", "products/b/thumb.webp", "image/webp", 10, 100, 100, "Back");
        Assert.True(first.IsPrimary);
        product.SetPrimaryImage(second.Id);
        Assert.True(second.IsPrimary);
        product.ReorderImages([second.Id, first.Id]);
        Assert.Equal(0, second.DisplayOrder);
        product.RemoveImage(second.Id);
        Assert.True(first.IsPrimary);
    }

    [Fact]
    public async Task Storage_failure_does_not_add_image_metadata()
    {
        var product = new Product("sku", "Product", "", Guid.NewGuid());
        var handler = new MediaHandlers(new Store(product), new FailingStorage(), new Processor(), new Effects());
        await Assert.ThrowsAsync<IOException>(() => handler.Handle(new UploadImage(product.Id, [1, 2, 3], "Alt"), CancellationToken.None));
        Assert.Empty(product.Images);
    }

    private sealed class Store(Product product) : ICatalogStore
    {
        public Task<Product?> Find(Guid id, CancellationToken ct) => Task.FromResult<Product?>(id == product.Id ? product : null);
        public Task<Category?> FindCategory(Guid id, CancellationToken ct) => Task.FromResult<Category?>(null);
        public Task<bool> CategoryExists(Guid id, CancellationToken ct) => Task.FromResult(false);
        public Task<bool> SkuExists(string sku, Guid? p, Guid? v, CancellationToken ct) => Task.FromResult(false);
        public void Add(Product p)
        {
        }

        public void Add(Category c)
        {
        }

        public Task<EcommercePlatform.BuildingBlocks.Application.Page<ProductDto>> List(ProductSearch s, bool a, CancellationToken ct) => throw new NotSupportedException();
        public Task<IReadOnlyList<CategoryDto>> Categories(CancellationToken ct) => throw new NotSupportedException();
    }

    private sealed class FailingStorage : IObjectStorage
    {
        public Task Put(string key, ReadOnlyMemory<byte> content, string type, CancellationToken ct) => Task.FromException(new IOException("storage failed"));
        public Task<StoredObject> Get(string key, CancellationToken ct) => throw new NotSupportedException();
        public Task Delete(string key, CancellationToken ct) => Task.CompletedTask;
        public string Url(string key) => key;
    }

    private sealed class Processor : IProductImageProcessor
    {
        public Task<ProcessedImage> Process(ReadOnlyMemory<byte> content, CancellationToken ct) => Task.FromResult(new ProcessedImage([1], [2], "image/webp", 100, 100));
    }

    private sealed class Effects : ITransactionEffects
    {
        public void OnRollback(Func<CancellationToken, Task> action)
        {
        }
    }
}
