using System.Net;
using System.Net.Http.Json;
using EcommercePlatform.Modules.Catalog.Application;
using EcommercePlatform.Modules.Catalog.Domain;
using EcommercePlatform.Modules.Catalog.Infrastructure;
using EcommercePlatform.BuildingBlocks.Application;
using Microsoft.Extensions.DependencyInjection;
using SkiaSharp;

namespace EcommercePlatform.IntegrationTests;
public sealed class CatalogAdministrationTests(CommerceFixture fixture) : IClassFixture<CommerceFixture>
{
    [Fact]
    public async Task Admin_can_manage_categories_products_attributes_variants_and_publication()
    {
        var category = await Category();
        var updated = await Put<CategoryDto>($"/api/admin/categories/{category.Id}", new { category.Name, Description = "Updated" });
        Assert.Equal("Updated", updated.Description);
        var product = await Product(category.Id, published: false);
        Assert.Equal(HttpStatusCode.NotFound, (await fixture.Anonymous.GetAsync($"/api/products/{product.Id}")).StatusCode);
        var attributes = await Put<ProductDto>($"/api/admin/products/{product.Id}/attributes", new { Attributes = new Dictionary<string, string> { { "Material", "Steel" }, { "Color", "Black" } } });
        Assert.Equal(2, attributes.Attributes!.Count);
        var variantResponse = await fixture.Admin.PostAsJsonAsync($"/api/admin/products/{product.Id}/variants", new { Sku = "VAR-" + Guid.NewGuid().ToString("N"), Name = "Large", Attributes = new Dictionary<string, string> { { "Size", "L" } } });
        variantResponse.EnsureSuccessStatusCode();
        var variant = (await variantResponse.Content.ReadFromJsonAsync<VariantDto>())!;
        var detail = (await fixture.Admin.GetFromJsonAsync<ProductDto>($"/api/admin/products/{product.Id}"))!;
        Assert.Single(detail.Variants!);
        (await fixture.Admin.PutAsync($"/api/admin/products/{product.Id}/publish", null)).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.OK, (await fixture.Anonymous.GetAsync($"/api/products/{product.Id}")).StatusCode);
        var search = (await fixture.Admin.GetFromJsonAsync<PageDto>($"/api/admin/products?search={product.Sku}&published=true&sort=sku"))!;
        Assert.Single(search.Items);
        (await fixture.Admin.DeleteAsync($"/api/admin/products/{product.Id}/variants/{variant.Id}")).EnsureSuccessStatusCode();
        Assert.Empty((await fixture.Admin.GetFromJsonAsync<ProductDto>($"/api/admin/products/{product.Id}"))!.Variants!);
        (await fixture.Admin.PutAsync($"/api/admin/products/{product.Id}/deactivate", null)).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.NotFound, (await fixture.Anonymous.GetAsync($"/api/products/{product.Id}")).StatusCode);
    }

    [Fact]
    public async Task Media_upload_validates_content_and_supports_order_primary_replace_and_delete()
    {
        var product = await Product((await Category()).Id);
        var first = await Upload(product.Id, Png(SKColors.Red), "Front");
        var second = await Upload(product.Id, Png(SKColors.Blue), "Back");
        Assert.True(first.IsPrimary);
        Assert.False(second.IsPrimary);
        Assert.Equal("image/webp", first.ContentType);
        Assert.Equal(200, first.Width);
        Assert.Equal(160, first.Height);
        var media = await fixture.Anonymous.GetAsync(first.Url);
        media.EnsureSuccessStatusCode();
        Assert.Equal("image/webp", media.Content.Headers.ContentType!.MediaType);
        var reordered = await Put<ImageDto[]>($"/api/admin/products/{product.Id}/images/reorder", new { ImageIds = new[] { second.Id, first.Id } });
        Assert.Equal(second.Id, reordered[0].Id);
        var primary = await Put<ImageDto>($"/api/admin/products/{product.Id}/images/{second.Id}/primary", new { });
        Assert.True(primary.IsPrimary);
        var replaced = await Upload(product.Id, Png(SKColors.Green), "Replacement", second.Id, HttpMethod.Put);
        Assert.Equal("Replacement", replaced.AltText);
        Assert.NotEqual(second.Url, replaced.Url);
        (await fixture.Admin.DeleteAsync($"/api/admin/products/{product.Id}/images/{first.Id}")).EnsureSuccessStatusCode();
        Assert.Single((await fixture.Admin.GetFromJsonAsync<ImageDto[]>($"/api/admin/products/{product.Id}/images"))!);
        (await fixture.Admin.PutAsync($"/api/admin/products/{product.Id}/deactivate", null)).EnsureSuccessStatusCode();
        Assert.Single((await fixture.Admin.GetFromJsonAsync<ImageDto[]>($"/api/admin/products/{product.Id}/images"))!);
        using var invalid = new MultipartFormDataContent();
        invalid.Add(new ByteArrayContent("not an image"u8.ToArray()), "file", "dangerous.exe");
        invalid.Add(new StringContent("Alt"), "altText");
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await fixture.Admin.PostAsync($"/api/admin/products/{product.Id}/images", invalid)).StatusCode);
    }

    [Fact]
    public async Task Database_failure_after_object_write_removes_uploaded_object()
    {
        await using var scope = fixture.Services.CreateAsyncScope();
        var storage = scope.ServiceProvider.GetRequiredService<IObjectStorage>();
        var effects = scope.ServiceProvider.GetRequiredService<ITransactionEffects>();
        var runner = scope.ServiceProvider.GetRequiredService<ITransactionRunner>();
        var db = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();
        var key = $"products/{Guid.NewGuid():N}/images/{Guid.NewGuid():N}/image.webp";
        await Assert.ThrowsAnyAsync<Exception>(() => runner.Run(async () =>
        {
            await storage.Put(key, Png(SKColors.Purple), "image/webp", CancellationToken.None);
            effects.OnRollback(token => storage.Delete(key, token));
            var duplicate = "Duplicate " + Guid.NewGuid();
            db.Categories.Add(new Category(duplicate));
            db.Categories.Add(new Category(duplicate));
            return true;
        }, CancellationToken.None));
        Assert.False(File.Exists(Path.Combine(fixture.MediaRoot, key.Replace('/', Path.DirectorySeparatorChar))));
    }

    [Fact]
    public async Task Customers_cannot_use_catalog_administration_or_upload_media()
    {
        Assert.Equal(HttpStatusCode.Forbidden, (await fixture.Buyer.GetAsync("/api/admin/products")).StatusCode);
        var response = await fixture.Buyer.PostAsJsonAsync("/api/admin/categories", new CreateCategory("Denied"));
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    private async Task<CategoryDto> Category()
    {
        var r = await fixture.Admin.PostAsJsonAsync("/api/admin/categories", new CreateCategory("Category " + Guid.NewGuid(), "Description"));
        r.EnsureSuccessStatusCode();
        return (await r.Content.ReadFromJsonAsync<CategoryDto>())!;
    }

    private async Task<ProductDto> Product(Guid category, bool published = true)
    {
        var r = await fixture.Admin.PostAsJsonAsync("/api/admin/products", new CreateProduct("SKU-" + Guid.NewGuid().ToString("N"), "Product", "Description", category, published));
        r.EnsureSuccessStatusCode();
        return (await r.Content.ReadFromJsonAsync<ProductDto>())!;
    }

    private async Task<T> Put<T>(string url, object value)
    {
        var r = await fixture.Admin.PutAsJsonAsync(url, value);
        r.EnsureSuccessStatusCode();
        return (await r.Content.ReadFromJsonAsync<T>())!;
    }

    private async Task<ImageDto> Upload(Guid product, byte[] bytes, string alt, Guid? image = null, HttpMethod? method = null)
    {
        using var response = await SendUpload(product, bytes, alt, image, method);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<ImageDto>())!;
    }

    private Task<HttpResponseMessage> SendUpload(Guid product, byte[] bytes, string alt, Guid? image = null, HttpMethod? method = null)
    {
        var multipart = new MultipartFormDataContent();
        multipart.Add(new ByteArrayContent(bytes), "file", "client-name.png");
        multipart.Add(new StringContent(alt), "altText");
        var request = new HttpRequestMessage(method ?? HttpMethod.Post, image is null ? $"/api/admin/products/{product}/images" : $"/api/admin/products/{product}/images/{image}")
        {
            Content = multipart
        };
        return fixture.Admin.SendAsync(request);
    }

    private static byte[] Png(SKColor color)
    {
        using var bitmap = new SKBitmap(200, 160);
        bitmap.Erase(color);
        using var image = SKImage.FromBitmap(bitmap);
        using var data = image.Encode(SKEncodedImageFormat.Png, 100);
        return data.ToArray();
    }

    private sealed record PageDto(ProductDto[] Items, int Number, int Size, int Total);
}
