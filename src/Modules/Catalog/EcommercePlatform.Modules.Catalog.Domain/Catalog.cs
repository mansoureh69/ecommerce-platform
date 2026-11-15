using EcommercePlatform.BuildingBlocks.Domain;

namespace EcommercePlatform.Modules.Catalog.Domain;
public sealed class Category : AggregateRoot
{
    public string Name { get; private set; } = "";
    public string Description { get; private set; } = "";

    private Category()
    {
    }

    public Category(string name, string description = "") => Update(name, description);
    public void Update(string name, string description)
    {
        Name = Guard.Text(name, 100, nameof(name));
        if (description is null || description.Length > 500)
            throw new DomainException("Category description is limited to 500 characters.");
        Description = description.Trim();
    }
}

public sealed class Product : AggregateRoot
{
    private readonly List<ProductVariant> variants = [];
    private readonly List<ProductAttribute> attributes = [];
    private readonly List<ProductImage> images = [];
    public string Sku { get; private set; } = "";
    public string Name { get; private set; } = "";
    public string Description { get; private set; } = "";
    public Guid CategoryId { get; private set; }
    public bool Active { get; private set; } = true;
    public bool Published { get; private set; } = true;
    public IReadOnlyCollection<ProductVariant> Variants => variants.AsReadOnly();
    public IReadOnlyCollection<ProductAttribute> Attributes => attributes.AsReadOnly();
    public IReadOnlyCollection<ProductImage> Images => images.OrderBy(x => x.DisplayOrder).ToArray();

    private Product()
    {
    }

    public Product(string sku, string name, string description, Guid categoryId, bool published = true)
    {
        Sku = NormalizeSku(sku);
        CategoryId = Guard.Id(categoryId);
        Published = published;
        Update(name, description, categoryId);
        Raise(new ProductCreated(Id));
    }

    public void Update(string name, string description, bool active)
    {
        Update(name, description, CategoryId);
        if (active)
            Activate();
        else
            Deactivate();
    }

    public void Update(string name, string description, Guid categoryId)
    {
        Name = Guard.Text(name, 200, nameof(name));
        CategoryId = Guard.Id(categoryId);
        if (description is null || description.Length > 2000)
            throw new DomainException("Description is limited to 2000 characters.");
        Description = description.Trim();
    }

    public void ChangeSku(string sku) => Sku = NormalizeSku(sku);
    public void Activate() => Active = true;
    public void Deactivate()
    {
        Active = false;
        Published = false;
    }

    public void Publish()
    {
        if (!Active)
            throw new ConflictException("An inactive product cannot be published.");
        Published = true;
    }

    public void Unpublish() => Published = false;
    public ProductVariant AddVariant(string sku, string name, IReadOnlyDictionary<string, string> values)
    {
        var variant = new ProductVariant(Id, sku, name, values);
        variants.Add(variant);
        return variant;
    }

    public void UpdateVariant(Guid id, string sku, string name, bool active, IReadOnlyDictionary<string, string> values)
    {
        var variant = variants.SingleOrDefault(x => x.Id == id) ?? throw new KeyNotFoundException();
        variant.Update(sku, name, active, values);
    }

    public void RemoveVariant(Guid id) => variants.Remove(variants.SingleOrDefault(x => x.Id == id) ?? throw new KeyNotFoundException());
    public void SetAttributes(IReadOnlyDictionary<string, string> values)
    {
        if (values.Count > 50)
            throw new DomainException("A product is limited to 50 attributes.");
        attributes.Clear();
        foreach (var pair in values.OrderBy(x => x.Key, StringComparer.OrdinalIgnoreCase))
            attributes.Add(new ProductAttribute(Id, pair.Key, pair.Value));
    }

    public ProductImage AddImage(Guid id, string key, string thumbnail, string contentType, long size, int width, int height, string alt)
    {
        if (images.Count >= 20)
            throw new DomainException("A product is limited to 20 images.");
        var image = new ProductImage(id, Id, key, thumbnail, contentType, size, width, height, alt, images.Count, images.Count == 0);
        images.Add(image);
        return image;
    }

    public ProductImage RequireImage(Guid id) => images.SingleOrDefault(x => x.Id == id) ?? throw new KeyNotFoundException();
    public void UpdateImage(Guid id, string alt) => RequireImage(id).SetAltText(alt);
    public void ReplaceImage(Guid id, string key, string thumbnail, string contentType, long size, int width, int height) => RequireImage(id).Replace(key, thumbnail, contentType, size, width, height);
    public ProductImage RemoveImage(Guid id)
    {
        var image = RequireImage(id);
        var primary = image.IsPrimary;
        images.Remove(image);
        NormalizeImageOrder();
        if (primary && images.Count > 0)
            images.OrderBy(x => x.DisplayOrder).First().SetPrimary(true);
        return image;
    }

    public void ReorderImages(IReadOnlyList<Guid> ids)
    {
        if (ids.Count != images.Count || ids.Distinct().Count() != ids.Count || ids.Any(id => images.All(x => x.Id != id)))
            throw new DomainException("Image order must contain every image exactly once.");
        for (var i = 0; i < ids.Count; i++)
            RequireImage(ids[i]).SetOrder(i);
    }

    public void SetPrimaryImage(Guid id)
    {
        RequireImage(id);
        foreach (var image in images)
            image.SetPrimary(image.Id == id);
    }

    private void NormalizeImageOrder()
    {
        var ordered = images.OrderBy(x => x.DisplayOrder).ToArray();
        for (var i = 0; i < ordered.Length; i++)
            ordered[i].SetOrder(i);
    }

    internal static string NormalizeSku(string sku) => Guard.Text(sku, 64, nameof(sku)).ToUpperInvariant();
}

public sealed class ProductVariant : Entity
{
    private readonly List<VariantAttribute> attributes = [];
    public Guid ProductId { get; private set; }
    public string Sku { get; private set; } = "";
    public string Name { get; private set; } = "";
    public bool Active { get; private set; } = true;
    public IReadOnlyCollection<VariantAttribute> Attributes => attributes.AsReadOnly();

    private ProductVariant()
    {
    }

    internal ProductVariant(Guid productId, string sku, string name, IReadOnlyDictionary<string, string> values)
    {
        ProductId = productId;
        Update(sku, name, true, values);
    }

    internal void Update(string sku, string name, bool active, IReadOnlyDictionary<string, string> values)
    {
        Sku = Product.NormalizeSku(sku);
        Name = Guard.Text(name, 200, nameof(name));
        Active = active;
        if (values.Count is 0 or > 20)
            throw new DomainException("A variant requires 1-20 attribute values.");
        attributes.Clear();
        foreach (var pair in values)
            attributes.Add(new VariantAttribute(Id, pair.Key, pair.Value));
    }
}

public sealed class ProductAttribute : Entity
{
    public Guid ProductId { get; private set; }
    public string Name { get; private set; } = "";
    public string Value { get; private set; } = "";

    private ProductAttribute()
    {
    }

    internal ProductAttribute(Guid id, string name, string value)
    {
        ProductId = id;
        Name = Guard.Text(name, 100, nameof(name));
        Value = Guard.Text(value, 500, nameof(value));
    }
}

public sealed class VariantAttribute : Entity
{
    public Guid VariantId { get; private set; }
    public string Name { get; private set; } = "";
    public string Value { get; private set; } = "";

    private VariantAttribute()
    {
    }

    internal VariantAttribute(Guid id, string name, string value)
    {
        VariantId = id;
        Name = Guard.Text(name, 100, nameof(name));
        Value = Guard.Text(value, 500, nameof(value));
    }
}

public sealed class ProductImage : Entity
{
    public Guid ProductId { get; private set; }
    public string StorageKey { get; private set; } = "";
    public string ThumbnailKey { get; private set; } = "";
    public string ContentType { get; private set; } = "";
    public long Size { get; private set; }
    public int Width { get; private set; }
    public int Height { get; private set; }
    public string AltText { get; private set; } = "";
    public int DisplayOrder { get; private set; }
    public bool IsPrimary { get; private set; }

    private ProductImage()
    {
    }

    internal ProductImage(Guid id, Guid productId, string key, string thumbnail, string contentType, long size, int width, int height, string alt, int order, bool primary)
    {
        Id = id;
        ProductId = productId;
        Replace(key, thumbnail, contentType, size, width, height);
        SetAltText(alt);
        DisplayOrder = order;
        IsPrimary = primary;
    }

    internal void SetAltText(string alt) => AltText = Guard.Text(alt, 250, nameof(alt));
    internal void SetOrder(int order)
    {
        if (order < 0)
            throw new DomainException("Image order cannot be negative.");
        DisplayOrder = order;
    }

    internal void SetPrimary(bool value) => IsPrimary = value;
    internal void Replace(string key, string thumbnail, string contentType, long size, int width, int height)
    {
        StorageKey = Guard.Text(key, 500, nameof(key));
        ThumbnailKey = Guard.Text(thumbnail, 500, nameof(thumbnail));
        ContentType = Guard.Text(contentType, 100, nameof(contentType));
        if (size <= 0 || width <= 0 || height <= 0)
            throw new DomainException("Image metadata is invalid.");
        Size = size;
        Width = width;
        Height = height;
    }
}

public sealed record ProductCreated(Guid ProductId) : DomainEvent;
