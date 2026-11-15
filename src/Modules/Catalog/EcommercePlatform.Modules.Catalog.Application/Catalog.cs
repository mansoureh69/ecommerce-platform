using EcommercePlatform.BuildingBlocks.Application;
using EcommercePlatform.BuildingBlocks.Domain;
using EcommercePlatform.Modules.Catalog.Domain;
using FluentValidation;
using MediatR;

namespace EcommercePlatform.Modules.Catalog.Application;
public sealed record AttributeDto(string Name, string Value);
public sealed record VariantDto(Guid Id, string Sku, string Name, bool Active, IReadOnlyList<AttributeDto> Attributes);
public sealed record ImageDto(Guid Id, string Url, string ThumbnailUrl, string ContentType, long Size, int Width, int Height, string AltText, int DisplayOrder, bool IsPrimary);
public sealed record ProductDto(Guid Id, string Sku, string Name, string Description, Guid CategoryId, bool Active, bool Published, IReadOnlyList<AttributeDto>? Attributes = null, IReadOnlyList<VariantDto>? Variants = null, IReadOnlyList<ImageDto>? Images = null);
public sealed record CategoryDto(Guid Id, string Name, string Description = "");
public sealed record ProductSearch(int Page = 1, int Size = 20, string? Search = null, Guid? CategoryId = null, bool? Active = null, bool? Published = null, string Sort = "name");
public interface ICatalogStore
{
    Task<Product?> Find(Guid id, CancellationToken ct);
    Task<Category?> FindCategory(Guid id, CancellationToken ct);
    Task<bool> CategoryExists(Guid id, CancellationToken ct);
    Task<bool> SkuExists(string sku, Guid? exceptProduct, Guid? exceptVariant, CancellationToken ct);
    void Add(Product product);
    void Add(Category category);
    Task<Page<ProductDto>> List(ProductSearch search, bool administration, CancellationToken ct);
    Task<IReadOnlyList<CategoryDto>> Categories(CancellationToken ct);
}

public interface ICatalog
{
    Task<ProductDto> RequireProduct(Guid id, CancellationToken ct);
}

public interface IObjectStorage
{
    Task Put(string key, ReadOnlyMemory<byte> content, string contentType, CancellationToken ct);
    Task<StoredObject> Get(string key, CancellationToken ct);
    Task Delete(string key, CancellationToken ct);
    string Url(string key);
}

public sealed record StoredObject(byte[] Content, string ContentType);
public interface IProductImageProcessor
{
    Task<ProcessedImage> Process(ReadOnlyMemory<byte> content, CancellationToken ct);
}

public sealed record ProcessedImage(byte[] Original, byte[] Thumbnail, string ContentType, int Width, int Height);
public sealed class CatalogService(ICatalogStore store) : ICatalog
{
    public async Task<ProductDto> RequireProduct(Guid id, CancellationToken ct)
    {
        var p = await store.Find(id, ct) ?? throw new KeyNotFoundException();
        if (!p.Active || !p.Published)
            throw new ConflictException("Product is unavailable.");
        return Mapping.Product(p, null);
    }
}

public static class Mapping
{
    public static ProductDto Product(Product p, IObjectStorage? storage) => new(p.Id, p.Sku, p.Name, p.Description, p.CategoryId, p.Active, p.Published, p.Attributes.Select(x => new AttributeDto(x.Name, x.Value)).ToArray(), p.Variants.Select(Variant).ToArray(), storage is null ? [] : p.Images.Select(x => Image(x, storage)).ToArray());
    public static VariantDto Variant(ProductVariant v) => new(v.Id, v.Sku, v.Name, v.Active, v.Attributes.Select(x => new AttributeDto(x.Name, x.Value)).ToArray());
    public static ImageDto Image(ProductImage i, IObjectStorage s) => new(i.Id, s.Url(i.StorageKey), s.Url(i.ThumbnailKey), i.ContentType, i.Size, i.Width, i.Height, i.AltText, i.DisplayOrder, i.IsPrimary);
}

public sealed record CreateCategory(string Name, string Description = "") : ICommand<CategoryDto>;
public sealed record UpdateCategory(Guid Id, string Name, string Description) : ICommand<CategoryDto>;
public sealed record CreateProduct(string Sku, string Name, string Description, Guid CategoryId, bool Published = true) : ICommand<ProductDto>;
public sealed record UpdateProduct(Guid Id, string Sku, string Name, string Description, Guid CategoryId) : ICommand<ProductDto>;
public sealed record SetProductState(Guid Id, bool? Active, bool? Published) : ICommand<ProductDto>;
public sealed record SetProductAttributes(Guid Id, IReadOnlyDictionary<string, string> Attributes) : ICommand<ProductDto>;
public sealed record CreateVariant(Guid ProductId, string Sku, string Name, IReadOnlyDictionary<string, string> Attributes) : ICommand<VariantDto>;
public sealed record UpdateVariant(Guid ProductId, Guid VariantId, string Sku, string Name, bool Active, IReadOnlyDictionary<string, string> Attributes) : ICommand<VariantDto>;
public sealed record DeleteVariant(Guid ProductId, Guid VariantId) : ICommand<bool>;
public sealed record GetProducts(int Page = 1, int Size = 20, Guid? CategoryId = null) : IRequest<Page<ProductDto>>;
public sealed record AdminGetProducts(ProductSearch Search) : IRequest<Page<ProductDto>>;
public sealed record GetProduct(Guid Id) : IRequest<ProductDto>;
public sealed record AdminGetProduct(Guid Id) : IRequest<ProductDto>;
public sealed record GetCategories : IRequest<IReadOnlyList<CategoryDto>>;
public sealed class ProductValidator : AbstractValidator<CreateProduct>
{
    public ProductValidator()
    {
        RuleFor(x => x.Sku).NotEmpty().MaximumLength(64);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).NotNull().MaximumLength(2000);
        RuleFor(x => x.CategoryId).NotEmpty();
    }
}

public sealed class SearchValidator : AbstractValidator<AdminGetProducts>
{
    public SearchValidator()
    {
        RuleFor(x => x.Search.Page).InclusiveBetween(1, 100000);
        RuleFor(x => x.Search.Size).InclusiveBetween(1, 100);
        RuleFor(x => x.Search.Sort).Must(x => new[] { "name", "name-desc", "sku", "newest" }.Contains(x)).WithMessage("Unsupported sort value.");
    }
}

public sealed class PageValidator : AbstractValidator<GetProducts>
{
    public PageValidator()
    {
        RuleFor(x => x.Page).InclusiveBetween(1, 100000);
        RuleFor(x => x.Size).InclusiveBetween(1, 100);
    }
}

public sealed class CatalogHandlers(ICatalogStore store, IObjectStorage storage) : IRequestHandler<CreateCategory, CategoryDto>, IRequestHandler<UpdateCategory, CategoryDto>, IRequestHandler<CreateProduct, ProductDto>, IRequestHandler<UpdateProduct, ProductDto>, IRequestHandler<SetProductState, ProductDto>, IRequestHandler<SetProductAttributes, ProductDto>, IRequestHandler<CreateVariant, VariantDto>, IRequestHandler<UpdateVariant, VariantDto>, IRequestHandler<DeleteVariant, bool>, IRequestHandler<GetProducts, Page<ProductDto>>, IRequestHandler<AdminGetProducts, Page<ProductDto>>, IRequestHandler<GetProduct, ProductDto>, IRequestHandler<AdminGetProduct, ProductDto>, IRequestHandler<GetCategories, IReadOnlyList<CategoryDto>>
{
    public Task<CategoryDto> Handle(CreateCategory r, CancellationToken ct)
    {
        var c = new Category(r.Name, r.Description);
        store.Add(c);
        return Task.FromResult(new CategoryDto(c.Id, c.Name, c.Description));
    }

    public async Task<CategoryDto> Handle(UpdateCategory r, CancellationToken ct)
    {
        var c = await store.FindCategory(r.Id, ct) ?? throw new KeyNotFoundException();
        c.Update(r.Name, r.Description);
        return new(c.Id, c.Name, c.Description);
    }

    public async Task<ProductDto> Handle(CreateProduct r, CancellationToken ct)
    {
        if (!await store.CategoryExists(r.CategoryId, ct))
            throw new KeyNotFoundException();
        await Unique(r.Sku, null, null, ct);
        var p = new Product(r.Sku, r.Name, r.Description, r.CategoryId, r.Published);
        store.Add(p);
        return Mapping.Product(p, storage);
    }

    public async Task<ProductDto> Handle(UpdateProduct r, CancellationToken ct)
    {
        var p = await Find(r.Id, ct);
        if (!await store.CategoryExists(r.CategoryId, ct))
            throw new KeyNotFoundException();
        await Unique(r.Sku, p.Id, null, ct);
        p.ChangeSku(r.Sku);
        p.Update(r.Name, r.Description, r.CategoryId);
        return Mapping.Product(p, storage);
    }

    public async Task<ProductDto> Handle(SetProductState r, CancellationToken ct)
    {
        var p = await Find(r.Id, ct);
        if (r.Active is true)
            p.Activate();
        if (r.Active is false)
            p.Deactivate();
        if (r.Published is true)
            p.Publish();
        if (r.Published is false)
            p.Unpublish();
        return Mapping.Product(p, storage);
    }

    public async Task<ProductDto> Handle(SetProductAttributes r, CancellationToken ct)
    {
        var p = await Find(r.Id, ct);
        p.SetAttributes(r.Attributes);
        return Mapping.Product(p, storage);
    }

    public async Task<VariantDto> Handle(CreateVariant r, CancellationToken ct)
    {
        var p = await Find(r.ProductId, ct);
        await Unique(r.Sku, null, null, ct);
        return Mapping.Variant(p.AddVariant(r.Sku, r.Name, r.Attributes));
    }

    public async Task<VariantDto> Handle(UpdateVariant r, CancellationToken ct)
    {
        var p = await Find(r.ProductId, ct);
        await Unique(r.Sku, null, r.VariantId, ct);
        p.UpdateVariant(r.VariantId, r.Sku, r.Name, r.Active, r.Attributes);
        return Mapping.Variant(p.Variants.Single(x => x.Id == r.VariantId));
    }

    public async Task<bool> Handle(DeleteVariant r, CancellationToken ct)
    {
        (await Find(r.ProductId, ct)).RemoveVariant(r.VariantId);
        return true;
    }

    public Task<Page<ProductDto>> Handle(GetProducts r, CancellationToken ct) => store.List(new(r.Page, r.Size, CategoryId: r.CategoryId, Active: true, Published: true), false, ct);
    public Task<Page<ProductDto>> Handle(AdminGetProducts r, CancellationToken ct) => store.List(r.Search, true, ct);
    public async Task<ProductDto> Handle(GetProduct r, CancellationToken ct)
    {
        var p = await Find(r.Id, ct);
        return p.Active && p.Published ? Mapping.Product(p, storage) : throw new KeyNotFoundException();
    }

    public async Task<ProductDto> Handle(AdminGetProduct r, CancellationToken ct) => Mapping.Product(await Find(r.Id, ct), storage);
    public Task<IReadOnlyList<CategoryDto>> Handle(GetCategories r, CancellationToken ct) => store.Categories(ct);
    private async Task<Product> Find(Guid id, CancellationToken ct) => await store.Find(id, ct) ?? throw new KeyNotFoundException();
    private async Task Unique(string sku, Guid? product, Guid? variant, CancellationToken ct)
    {
        if (await store.SkuExists(sku, product, variant, ct))
            throw new ConflictException("SKU already exists.");
    }
}
