using EcommercePlatform.Modules.Identity.Application;
using EcommercePlatform.Modules.Catalog.Application;
using EcommercePlatform.Modules.Pricing.Application;
using EcommercePlatform.Modules.Inventory.Application;
using EcommercePlatform.Modules.Cart.Application;
using EcommercePlatform.Modules.Orders.Application;
using EcommercePlatform.Modules.Payments.Application;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace EcommercePlatform.Api;
public static class Endpoints
{
    public static void MapCommerce(this WebApplication app)
    {
        var api = app.MapGroup("/api");
        api.MapPost("/auth/register", async (Register r, ISender s, CancellationToken ct) =>
        {
            var x = await s.Send(r, ct);
            return x.Success ? Results.Ok(x) : Results.Problem(statusCode: 400, title: x.Error);
        }).RequireRateLimiting("auth");
        api.MapPost("/auth/login", async (Login r, ISender s, CancellationToken ct) =>
        {
            var x = await s.Send(r, ct);
            return x.Success ? Results.Ok(x) : Results.Problem(statusCode: 401, title: x.Error);
        }).RequireRateLimiting("auth");
        api.MapPost("/auth/google", async (GoogleLogin r, ISender s, CancellationToken ct) =>
        {
            var x = await s.Send(r, ct);
            return x.Success ? Results.Ok(x) : Results.Problem(statusCode: 401, title: x.Error);
        }).RequireRateLimiting("auth");
        api.MapGet("/categories", (ISender s, CancellationToken ct) => s.Send(new GetCategories(), ct));
        api.MapGet("/products", (int? page, int? size, Guid? categoryId, ISender s, CancellationToken ct) => s.Send(new GetProducts(page ?? 1, size ?? 20, categoryId), ct));
        api.MapGet("/products/{id:guid}", (Guid id, ISender s, CancellationToken ct) => s.Send(new GetProduct(id), ct));
        api.MapGet("/products/{id:guid}/price", (Guid id, ISender s, CancellationToken ct) => s.Send(new GetPrice(id), ct));
        api.MapGet("/media/{**key}", async (string key, ISender s, CancellationToken ct) =>
        {
            var media = await s.Send(new GetMedia(key), ct);
            return Results.File(media.Content, media.ContentType);
        });
        // Compatibility routes retained for the verified checkout test clients.
        api.MapPost("/categories", async (CreateCategory r, ISender s, CancellationToken ct) =>
        {
            var c = await s.Send(r, ct);
            return Results.Created($"/api/admin/categories/{c.Id}", c);
        }).RequireAuthorization("Admin");
        api.MapPost("/products", async (CreateProduct r, ISender s, CancellationToken ct) =>
        {
            var p = await s.Send(r, ct);
            return Results.Created($"/api/admin/products/{p.Id}", p);
        }).RequireAuthorization("Admin");
        api.MapPut("/products/{id:guid}", (Guid id, LegacyProductUpdate r, ISender s, CancellationToken ct) => s.Send(new SetProductState(id, r.Active, null), ct)).RequireAuthorization("Admin");
        api.MapPut("/products/{id:guid}/price", (Guid id, PriceInput r, ISender s, CancellationToken ct) => s.Send(new SetPrice(id, r.Amount, r.Currency), ct)).RequireAuthorization("Admin");
        api.MapGet("/inventory/{id:guid}", (Guid id, ISender s, CancellationToken ct) => s.Send(new GetStock(id), ct)).RequireAuthorization("Admin");
        api.MapPost("/inventory/{id:guid}/receipts", (Guid id, StockInput r, ISender s, CancellationToken ct) => s.Send(new ReceiveStock(id, r.Quantity), ct)).RequireAuthorization("Admin");
        MapCatalogAdmin(api.MapGroup("/admin").RequireAuthorization("Admin"));
        api.MapGet("/cart", (ISender s, CancellationToken ct) => s.Send(new GetCart(), ct)).RequireAuthorization();
        api.MapPut("/cart/lines/{id:guid}", (Guid id, StockInput r, ISender s, CancellationToken ct) => s.Send(new SetCartLine(id, r.Quantity), ct)).RequireAuthorization();
        api.MapPost("/orders", async (Checkout r, ISender s, CancellationToken ct) =>
        {
            var o = await s.Send(r, ct);
            return Results.Created($"/api/orders/{o.Id}", o);
        }).RequireAuthorization();
        api.MapGet("/orders/{id:guid}", (Guid id, ISender s, CancellationToken ct) => s.Send(new GetOrder(id), ct)).RequireAuthorization();
        api.MapPost("/orders/{id:guid}/cancel", (Guid id, ISender s, CancellationToken ct) => s.Send(new CancelOrder(id), ct)).RequireAuthorization();
        api.MapPost("/orders/{id:guid}/ship", (Guid id, ISender s, CancellationToken ct) => s.Send(new FulfillOrder(id, false), ct)).RequireAuthorization("Admin");
        api.MapPost("/orders/{id:guid}/deliver", (Guid id, ISender s, CancellationToken ct) => s.Send(new FulfillOrder(id, true), ct)).RequireAuthorization("Admin");
        api.MapGet("/orders/{id:guid}/payment", (Guid id, ISender s, CancellationToken ct) => s.Send(new GetPayment(id), ct)).RequireAuthorization();
        api.MapPost("/payments/manual-settlements", (RecordSettlement r, ISender s, CancellationToken ct) => s.Send(r, ct)).RequireAuthorization("Admin");
        api.MapPost("/payments/manual-refunds", (RecordRefund r, ISender s, CancellationToken ct) => s.Send(r, ct)).RequireAuthorization("Admin");
    }

    private static void MapCatalogAdmin(RouteGroupBuilder admin)
    {
        admin.MapPost("/categories", async (CreateCategory r, ISender s, CancellationToken ct) =>
        {
            var c = await s.Send(r, ct);
            return Results.Created($"/api/admin/categories/{c.Id}", c);
        });
        admin.MapPut("/categories/{id:guid}", (Guid id, CategoryInput r, ISender s, CancellationToken ct) => s.Send(new UpdateCategory(id, r.Name, r.Description), ct));
        admin.MapGet("/categories", (ISender s, CancellationToken ct) => s.Send(new GetCategories(), ct));
        admin.MapPost("/products", async (CreateProduct r, ISender s, CancellationToken ct) =>
        {
            var p = await s.Send(r, ct);
            return Results.Created($"/api/admin/products/{p.Id}", p);
        });
        admin.MapPut("/products/{id:guid}", (Guid id, ProductInput r, ISender s, CancellationToken ct) => s.Send(new UpdateProduct(id, r.Sku, r.Name, r.Description, r.CategoryId), ct));
        admin.MapGet("/products", ([AsParameters] ProductSearch search, ISender s, CancellationToken ct) => s.Send(new AdminGetProducts(search), ct));
        admin.MapGet("/products/{id:guid}", (Guid id, ISender s, CancellationToken ct) => s.Send(new AdminGetProduct(id), ct));
        admin.MapPut("/products/{id:guid}/state", (Guid id, ProductStateInput r, ISender s, CancellationToken ct) => s.Send(new SetProductState(id, r.Active, r.Published), ct));
        admin.MapPut("/products/{id:guid}/activate", (Guid id, ISender s, CancellationToken ct) => s.Send(new SetProductState(id, true, null), ct));
        admin.MapPut("/products/{id:guid}/deactivate", (Guid id, ISender s, CancellationToken ct) => s.Send(new SetProductState(id, false, null), ct));
        admin.MapPut("/products/{id:guid}/publish", (Guid id, ISender s, CancellationToken ct) => s.Send(new SetProductState(id, null, true), ct));
        admin.MapPut("/products/{id:guid}/unpublish", (Guid id, ISender s, CancellationToken ct) => s.Send(new SetProductState(id, null, false), ct));
        admin.MapPut("/products/{id:guid}/attributes", (Guid id, AttributesInput r, ISender s, CancellationToken ct) => s.Send(new SetProductAttributes(id, r.Attributes), ct));
        admin.MapPost("/products/{id:guid}/variants", (Guid id, VariantInput r, ISender s, CancellationToken ct) => s.Send(new CreateVariant(id, r.Sku, r.Name, r.Attributes), ct));
        admin.MapPut("/products/{id:guid}/variants/{variantId:guid}", (Guid id, Guid variantId, VariantUpdateInput r, ISender s, CancellationToken ct) => s.Send(new UpdateVariant(id, variantId, r.Sku, r.Name, r.Active, r.Attributes), ct));
        admin.MapDelete("/products/{id:guid}/variants/{variantId:guid}", async (Guid id, Guid variantId, ISender s, CancellationToken ct) =>
        {
            await s.Send(new DeleteVariant(id, variantId), ct);
            return Results.NoContent();
        });
        admin.MapGet("/orders", (int? page, int? size, string? status, ISender s, CancellationToken ct) => s.Send(new AdminListOrders(page ?? 1, size ?? 20, status), ct));
        admin.MapGet("/orders/{id:guid}", (Guid id, ISender s, CancellationToken ct) => s.Send(new AdminGetOrder(id), ct));
        admin.MapPost("/orders/{id:guid}/cancel", (Guid id, ISender s, CancellationToken ct) => s.Send(new AdminCancelOrder(id), ct));
        admin.MapGet("/payments", (int? page, int? size, ISender s, CancellationToken ct) => s.Send(new AdminListPayments(page ?? 1, size ?? 20), ct));
        admin.MapGet("/payments/{orderId:guid}", (Guid orderId, ISender s, CancellationToken ct) => s.Send(new AdminGetPayment(orderId), ct));
        admin.MapGet("/inventory", (int? page, int? size, ISender s, CancellationToken ct) => s.Send(new AdminListStock(page ?? 1, size ?? 20), ct));
        admin.MapGet("/inventory/{productId:guid}", (Guid productId, ISender s, CancellationToken ct) => s.Send(new AdminGetStock(productId), ct));
        admin.MapGet("/products/{id:guid}/images", (Guid id, ISender s, CancellationToken ct) => s.Send(new GetImages(id), ct));
        admin.MapPost("/products/{id:guid}/images", async (Guid id, HttpRequest request, ISender s, CancellationToken ct) =>
        {
            var input = await ReadImage(request, ct);
            var image = await s.Send(new UploadImage(id, input.Content, input.AltText), ct);
            return Results.Created($"/api/admin/products/{id}/images/{image.Id}", image);
        });
        admin.MapPut("/products/{id:guid}/images/{imageId:guid}", async (Guid id, Guid imageId, HttpRequest request, ISender s, CancellationToken ct) =>
        {
            var form = await request.ReadFormAsync(ct);
            var file = form.Files.GetFile("file");
            return file is null ? await s.Send(new UpdateImage(id, imageId, form["altText"].ToString()), ct) : await s.Send(new ReplaceImage(id, imageId, await Bytes(file, ct), form["altText"].ToString()), ct);
        });
        admin.MapDelete("/products/{id:guid}/images/{imageId:guid}", async (Guid id, Guid imageId, ISender s, CancellationToken ct) =>
        {
            await s.Send(new DeleteImage(id, imageId), ct);
            return Results.NoContent();
        });
        admin.MapPut("/products/{id:guid}/images/reorder", (Guid id, ImageOrderInput r, ISender s, CancellationToken ct) => s.Send(new ReorderImages(id, r.ImageIds), ct));
        admin.MapPut("/products/{id:guid}/images/{imageId:guid}/primary", (Guid id, Guid imageId, ISender s, CancellationToken ct) => s.Send(new SetPrimaryImage(id, imageId), ct));
    }

    private static async Task<(byte[] Content, string AltText)> ReadImage(HttpRequest request, CancellationToken ct)
    {
        var form = await request.ReadFormAsync(ct);
        var file = form.Files.GetFile("file") ?? throw new BadHttpRequestException("Multipart field 'file' is required.");
        return (await Bytes(file, ct), form["altText"].ToString());
    }

    private static async Task<byte[]> Bytes(IFormFile file, CancellationToken ct)
    {
        if (file.Length is <= 0 or > 10 * 1024 * 1024)
            throw new BadHttpRequestException("Image must be between 1 byte and 10 MB.");
        await using var input = file.OpenReadStream();
        using var output = new MemoryStream();
        await input.CopyToAsync(output, ct);
        if (output.Length > 10 * 1024 * 1024)
            throw new BadHttpRequestException("Image exceeds 10 MB.");
        return output.ToArray();
    }
}

public sealed record LegacyProductUpdate(string Name, string Description, bool Active);
public sealed record ProductInput(string Sku, string Name, string Description, Guid CategoryId);
public sealed record ProductStateInput(bool? Active, bool? Published);
public sealed record CategoryInput(string Name, string Description);
public sealed record AttributesInput(IReadOnlyDictionary<string, string> Attributes);
public sealed record VariantInput(string Sku, string Name, IReadOnlyDictionary<string, string> Attributes);
public sealed record VariantUpdateInput(string Sku, string Name, bool Active, IReadOnlyDictionary<string, string> Attributes);
public sealed record ImageOrderInput(IReadOnlyList<Guid> ImageIds);
public sealed record PriceInput(decimal Amount, string Currency);
public sealed record StockInput(int Quantity);
