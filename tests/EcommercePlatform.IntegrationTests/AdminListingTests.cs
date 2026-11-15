using System.Net;
using System.Net.Http.Json;
using EcommercePlatform.BuildingBlocks.Application;
using EcommercePlatform.Modules.Cart.Application;
using EcommercePlatform.Modules.Catalog.Application;
using EcommercePlatform.Modules.Inventory.Application;
using EcommercePlatform.Modules.Orders.Application;
using EcommercePlatform.Modules.Payments.Application;

namespace EcommercePlatform.IntegrationTests;
public sealed class AdminListingTests(CommerceFixture fixture) : IClassFixture<CommerceFixture>
{
    private async Task<(ProductDto Product, OrderDto Order)> PlaceOrder()
    {
        var category = (await (await fixture.Admin.PostAsJsonAsync("/api/categories", new CreateCategory("Category " + Guid.NewGuid()))).Content.ReadFromJsonAsync<CategoryDto>())!;
        var product = (await (await fixture.Admin.PostAsJsonAsync("/api/products", new CreateProduct(Guid.NewGuid().ToString("N"), "Listed item", "Description", category.Id))).Content.ReadFromJsonAsync<ProductDto>())!;
        (await fixture.Admin.PutAsJsonAsync($"/api/products/{product.Id}/price", new { Amount = 10, Currency = "USD" })).EnsureSuccessStatusCode();
        (await fixture.Admin.PostAsJsonAsync($"/api/inventory/{product.Id}/receipts", new { Quantity = 5 })).EnsureSuccessStatusCode();
        var cart = await (await fixture.Buyer.PutAsJsonAsync($"/api/cart/lines/{product.Id}", new { Quantity = 2 })).Content.ReadFromJsonAsync<CartDto>();
        var response = await fixture.Buyer.PostAsJsonAsync("/api/orders", new Checkout(Guid.NewGuid(), cart!.Version, new("Customer", "1 Main Street", "City", "12345", "Country")));
        response.EnsureSuccessStatusCode();
        return (product, (await response.Content.ReadFromJsonAsync<OrderDto>())!);
    }

    [Fact]
    public async Task Admin_can_list_and_read_any_order_payment_and_stock_while_others_are_refused()
    {
        var (product, order) = await PlaceOrder();

        Assert.Equal(HttpStatusCode.Unauthorized, (await fixture.Anonymous.GetAsync("/api/admin/orders")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await fixture.Buyer.GetAsync("/api/admin/orders")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await fixture.Buyer.GetAsync("/api/admin/payments")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await fixture.Buyer.GetAsync("/api/admin/inventory")).StatusCode);

        var pending = (await fixture.Admin.GetFromJsonAsync<Page<OrderDto>>("/api/admin/orders?status=pendingpayment&size=100"))!;
        Assert.Contains(pending.Items, x => x.Id == order.Id);
        Assert.All(pending.Items, x => Assert.Equal("PendingPayment", x.Status));
        Assert.Equal(order.Id, (await fixture.Admin.GetFromJsonAsync<OrderDto>($"/api/admin/orders/{order.Id}"))!.Id);
        Assert.Equal(HttpStatusCode.BadRequest, (await fixture.Admin.GetAsync("/api/admin/orders?status=bogus")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await fixture.Admin.GetAsync("/api/admin/orders?size=1000")).StatusCode);

        var stock = (await fixture.Admin.GetFromJsonAsync<StockDto>($"/api/admin/inventory/{product.Id}"))!;
        Assert.Equal(3, stock.Available);
        Assert.Equal(2, stock.Reserved);
        Assert.Single(stock.Reservations);
        Assert.Contains((await fixture.Admin.GetFromJsonAsync<Page<StockDto>>("/api/admin/inventory?size=100"))!.Items, x => x.ProductId == product.Id || x.Reservations.Count >= 0);

        var settlement = new RecordSettlement(order.Id, 20, "USD", "bank-" + Guid.NewGuid());
        (await fixture.Admin.PostAsJsonAsync("/api/payments/manual-settlements", settlement)).EnsureSuccessStatusCode();
        var payment = (await fixture.Admin.GetFromJsonAsync<AdminPaymentDto>($"/api/admin/payments/{order.Id}"))!;
        Assert.Equal(settlement.Reference, payment.Reference);
        Assert.Null(payment.RefundReference);
        Assert.Contains((await fixture.Admin.GetFromJsonAsync<Page<AdminPaymentDto>>("/api/admin/payments?size=100"))!.Items, x => x.OrderId == order.Id);
        Assert.Equal(2, (await fixture.Admin.GetFromJsonAsync<StockDto>($"/api/admin/inventory/{product.Id}"))!.Consumed);
    }

    [Fact]
    public async Task Admin_can_cancel_a_customers_pending_order_and_release_stock()
    {
        var (product, order) = await PlaceOrder();
        Assert.Equal(HttpStatusCode.Forbidden, (await fixture.Buyer.PostAsync($"/api/admin/orders/{order.Id}/cancel", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await fixture.Admin.PostAsync($"/api/admin/orders/{Guid.NewGuid()}/cancel", null)).StatusCode);
        var cancelled = await fixture.Admin.PostAsync($"/api/admin/orders/{order.Id}/cancel", null);
        cancelled.EnsureSuccessStatusCode();
        Assert.Equal("Cancelled", (await cancelled.Content.ReadFromJsonAsync<OrderDto>())!.Status);
        Assert.Equal(5, (await fixture.Admin.GetFromJsonAsync<StockDto>($"/api/admin/inventory/{product.Id}"))!.Available);
    }
}
