using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using EcommercePlatform.BuildingBlocks.Application;
using EcommercePlatform.BuildingBlocks.Infrastructure;
using EcommercePlatform.Modules.Catalog.Application;
using EcommercePlatform.Modules.Cart.Application;
using EcommercePlatform.Modules.Identity.Application;
using EcommercePlatform.Modules.Identity.Infrastructure;
using EcommercePlatform.Modules.Orders.Application;
using EcommercePlatform.Modules.Payments.Application;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace EcommercePlatform.IntegrationTests;
public sealed class CommerceFixture : IAsyncLifetime
{
    private WebApplicationFactory<Program> factory = null!;
    private string adminConnection = "";
    private readonly string database = "ecommerce_test_" + Guid.NewGuid().ToString("N");
    private readonly string mediaRoot = Path.Combine(Path.GetTempPath(), "ecommerce-media-" + Guid.NewGuid().ToString("N"));
    public HttpClient Admin { get; private set; } = null!;
    public HttpClient Buyer { get; private set; } = null!;
    public HttpClient Other { get; private set; } = null!;
    public HttpClient Anonymous { get; private set; } = null!;
    public IServiceProvider Services => factory.Services;
    public string MediaRoot => mediaRoot;

    public async Task InitializeAsync()
    {
        adminConnection = Environment.GetEnvironmentVariable("TEST_POSTGRES_CONNECTION") ?? throw new InvalidOperationException("Set TEST_POSTGRES_CONNECTION to a PostgreSQL connection with CREATE DATABASE permission. Integration tests never silently skip.");
        await using (var connection = new NpgsqlConnection(adminConnection))
        {
            await connection.OpenAsync();
            await using var command = new NpgsqlCommand($"CREATE DATABASE {database}", connection);
            await command.ExecuteNonQueryAsync();
        }

        var cs = new NpgsqlConnectionStringBuilder(adminConnection)
        {
            Database = database
        }.ConnectionString;
        factory = new WebApplicationFactory<Program>().WithWebHostBuilder(b =>
        {
            b.UseEnvironment("Testing");
            b.UseSetting("ConnectionStrings:Database", cs);
            b.UseSetting("Jwt:Secret", Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32)));
            b.UseSetting("Catalog:Media:Provider", "Local");
            b.UseSetting("Catalog:Media:LocalRoot", mediaRoot);
            b.ConfigureTestServices(services => services.AddSingleton<EcommercePlatform.Modules.Identity.Application.IGoogleIdentity, FakeGoogleIdentity>());
        });
        Anonymous = factory.CreateClient();
        await using (var scope = Services.CreateAsyncScope())
        {
            foreach (var session in scope.ServiceProvider.GetRequiredService<IEnumerable<IModuleSession>>())
                await session.Context.Database.MigrateAsync();
            await scope.ServiceProvider.GetRequiredService<ITransactionRunner>().Run(async () =>
            {
                var roles = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
                Assert.True((await roles.CreateAsync(new IdentityRole<Guid>("Admin"))).Succeeded);
                var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
                var admin = new ApplicationUser
                {
                    Id = Guid.NewGuid(),
                    UserName = "admin@example.com",
                    Email = "admin@example.com",
                    LockoutEnabled = true
                };
                Assert.True((await users.CreateAsync(admin, "TestPassword!123")).Succeeded);
                Assert.True((await users.AddToRoleAsync(admin, "Admin")).Succeeded);
                return true;
            }, CancellationToken.None);
        }

        Admin = await Login("admin@example.com");
        Buyer = await Register("buyer@example.com");
        Other = await Register("other@example.com");
    }

    public async Task<HttpClient> Register(string email)
    {
        var response = await Anonymous.PostAsJsonAsync("/api/auth/register", new Register(email, "TestPassword!123"));
        response.EnsureSuccessStatusCode();
        return Client((await response.Content.ReadFromJsonAsync<AuthResult>())!.Token!);
    }

    private async Task<HttpClient> Login(string email)
    {
        var response = await Anonymous.PostAsJsonAsync("/api/auth/login", new Login(email, "TestPassword!123"));
        response.EnsureSuccessStatusCode();
        return Client((await response.Content.ReadFromJsonAsync<AuthResult>())!.Token!);
    }

    public HttpClient Client(string token)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    public async Task DisposeAsync()
    {
        Admin?.Dispose();
        Buyer?.Dispose();
        Other?.Dispose();
        Anonymous?.Dispose();
        if (factory is not null)
            await factory.DisposeAsync();
        if (adminConnection.Length == 0)
            return;
        NpgsqlConnection.ClearAllPools();
        await using var connection = new NpgsqlConnection(adminConnection);
        await connection.OpenAsync();
        // Only the random database created by this fixture is removed.
        await using var command = new NpgsqlCommand($"DROP DATABASE IF EXISTS {database} WITH (FORCE)", connection);
        await command.ExecuteNonQueryAsync();
        if (Directory.Exists(mediaRoot))
            Directory.Delete(mediaRoot, true);
    }
}

public sealed class CommerceTests(CommerceFixture fixture) : IClassFixture<CommerceFixture>
{
    private static readonly AddressInput Address = new("Customer", "1 Main Street", "City", "12345", "Country");
    private async Task<ProductDto> Product(int stock = 5)
    {
        var categoryResponse = await fixture.Admin.PostAsJsonAsync("/api/categories", new CreateCategory("Category " + Guid.NewGuid()));
        categoryResponse.EnsureSuccessStatusCode();
        var category = (await categoryResponse.Content.ReadFromJsonAsync<CategoryDto>())!;
        var response = await fixture.Admin.PostAsJsonAsync("/api/products", new CreateProduct(Guid.NewGuid().ToString("N"), "Generic item", "Description", category.Id));
        response.EnsureSuccessStatusCode();
        var product = (await response.Content.ReadFromJsonAsync<ProductDto>())!;
        (await fixture.Admin.PutAsJsonAsync($"/api/products/{product.Id}/price", new { Amount = 10, Currency = "USD" })).EnsureSuccessStatusCode();
        if (stock > 0)
            (await fixture.Admin.PostAsJsonAsync($"/api/inventory/{product.Id}/receipts", new { Quantity = stock })).EnsureSuccessStatusCode();
        return product;
    }

    private static async Task<CartDto> Set(HttpClient client, Guid id, int quantity)
    {
        var r = await client.PutAsJsonAsync($"/api/cart/lines/{id}", new { Quantity = quantity });
        r.EnsureSuccessStatusCode();
        return (await r.Content.ReadFromJsonAsync<CartDto>())!;
    }

    private async Task Clear(HttpClient client)
    {
        var cart = (await client.GetFromJsonAsync<CartDto>("/api/cart"))!;
        foreach (var line in cart.Lines)
            await Set(client, line.ProductId, 0);
    }

    private async Task<OrderDto> Place(HttpClient client, Guid product, int quantity = 1)
    {
        await Clear(client);
        var cart = await Set(client, product, quantity);
        var response = await client.PostAsJsonAsync("/api/orders", new Checkout(Guid.NewGuid(), cart.Version, Address));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<OrderDto>())!;
    }

    private Task<int> Stock(Guid product) => fixture.Admin.GetFromJsonAsync<int>($"/api/inventory/{product}");
    [Fact]
    public async Task Checkout_settlement_and_fulfillment_use_authoritative_prices_and_ownership()
    {
        var p = await Product();
        var order = await Place(fixture.Buyer, p.Id, 2);
        Assert.Equal(20, order.Total.Amount);
        Assert.Equal(3, await Stock(p.Id));
        Assert.Equal(HttpStatusCode.NotFound, (await fixture.Other.GetAsync($"/api/orders/{order.Id}")).StatusCode);
        var command = new RecordSettlement(order.Id, 20, "USD", "bank-" + Guid.NewGuid());
        Assert.Equal(HttpStatusCode.Forbidden, (await fixture.Buyer.PostAsJsonAsync("/api/payments/manual-settlements", command)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await fixture.Admin.PostAsJsonAsync("/api/payments/manual-settlements", command with { Amount = 19 })).StatusCode);
        (await fixture.Admin.PostAsJsonAsync("/api/payments/manual-settlements", command)).EnsureSuccessStatusCode();
        (await fixture.Admin.PostAsJsonAsync("/api/payments/manual-settlements", command)).EnsureSuccessStatusCode();
        Assert.Equal("Paid", (await fixture.Buyer.GetFromJsonAsync<OrderDto>($"/api/orders/{order.Id}"))!.Status);
        Assert.Equal(HttpStatusCode.Conflict, (await fixture.Buyer.PostAsync($"/api/orders/{order.Id}/cancel", null)).StatusCode);
        (await fixture.Admin.PostAsync($"/api/orders/{order.Id}/ship", null)).EnsureSuccessStatusCode();
        (await fixture.Admin.PostAsync($"/api/orders/{order.Id}/deliver", null)).EnsureSuccessStatusCode();
        Assert.Equal("Delivered", (await fixture.Buyer.GetFromJsonAsync<OrderDto>($"/api/orders/{order.Id}"))!.Status);
        Assert.Equal(HttpStatusCode.NotFound, (await fixture.Other.GetAsync($"/api/orders/{order.Id}/payment")).StatusCode);
    }

    [Fact]
    public async Task Checkout_replay_and_cancellation_are_idempotent()
    {
        await Clear(fixture.Buyer);
        var p = await Product();
        var cart = await Set(fixture.Buyer, p.Id, 2);
        var command = new Checkout(Guid.NewGuid(), cart.Version, Address);
        var response = await fixture.Buyer.PostAsJsonAsync("/api/orders", command);
        response.EnsureSuccessStatusCode();
        var order = (await response.Content.ReadFromJsonAsync<OrderDto>())!;
        var replay = await fixture.Buyer.PostAsJsonAsync("/api/orders", command);
        replay.EnsureSuccessStatusCode();
        Assert.Equal(order.Id, (await replay.Content.ReadFromJsonAsync<OrderDto>())!.Id);
        Assert.Equal(HttpStatusCode.Conflict, (await fixture.Buyer.PostAsJsonAsync("/api/orders", command with { CartVersion = Guid.NewGuid() })).StatusCode);
        (await fixture.Buyer.PostAsync($"/api/orders/{order.Id}/cancel", null)).EnsureSuccessStatusCode();
        (await fixture.Buyer.PostAsync($"/api/orders/{order.Id}/cancel", null)).EnsureSuccessStatusCode();
        Assert.Equal(5, await Stock(p.Id));
    }

    [Fact]
    public async Task Failed_checkout_rolls_back_every_reservation_and_preserves_cart()
    {
        await Clear(fixture.Buyer);
        var p1 = await Product();
        var p2 = await Product();
        var ordered = new[]
        {
            p1,
            p2
        }.OrderBy(p => p.Id).ToArray();
        await Set(fixture.Buyer, ordered[0].Id, 1);
        var cart = await Set(fixture.Buyer, ordered[1].Id, 6);
        var result = await fixture.Buyer.PostAsJsonAsync("/api/orders", new Checkout(Guid.NewGuid(), cart.Version, Address));
        Assert.Equal(HttpStatusCode.Conflict, result.StatusCode);
        Assert.Equal(5, await Stock(p1.Id));
        Assert.Equal(5, await Stock(p2.Id));
        Assert.Equal(cart.Version, (await fixture.Buyer.GetFromJsonAsync<CartDto>("/api/cart"))!.Version);
        await Clear(fixture.Buyer);
    }

    [Fact]
    public async Task Competing_checkouts_cannot_oversell_last_unit()
    {
        await Clear(fixture.Buyer);
        await Clear(fixture.Other);
        var p = await Product(1);
        var a = await Set(fixture.Buyer, p.Id, 1);
        var b = await Set(fixture.Other, p.Id, 1);
        var results = await Task.WhenAll(fixture.Buyer.PostAsJsonAsync("/api/orders", new Checkout(Guid.NewGuid(), a.Version, Address)), fixture.Other.PostAsJsonAsync("/api/orders", new Checkout(Guid.NewGuid(), b.Version, Address)));
        Assert.Single(results, r => r.IsSuccessStatusCode);
        Assert.Single(results, r => r.StatusCode == HttpStatusCode.Conflict);
        Assert.Equal(0, await Stock(p.Id));
        await Clear(fixture.Buyer);
        await Clear(fixture.Other);
    }

    [Fact]
    public async Task Manual_refund_is_atomic_and_does_not_invent_physical_returns()
    {
        var p = await Product();
        var o = await Place(fixture.Buyer, p.Id);
        (await fixture.Admin.PostAsJsonAsync("/api/payments/manual-settlements", new RecordSettlement(o.Id, 10, "USD", "settle-" + Guid.NewGuid()))).EnsureSuccessStatusCode();
        var refund = new RecordRefund(o.Id, "refund-" + Guid.NewGuid());
        (await fixture.Admin.PostAsJsonAsync("/api/payments/manual-refunds", refund)).EnsureSuccessStatusCode();
        (await fixture.Admin.PostAsJsonAsync("/api/payments/manual-refunds", refund)).EnsureSuccessStatusCode();
        Assert.Equal("Refunded", (await fixture.Buyer.GetFromJsonAsync<OrderDto>($"/api/orders/{o.Id}"))!.Status);
        Assert.Equal(4, await Stock(p.Id));
    }

    [Fact]
    public async Task Duplicate_bank_reference_rolls_back_already_saved_order_and_inventory_changes()
    {
        var product = await Product();
        var first = await Place(fixture.Buyer, product.Id);
        var second = await Place(fixture.Buyer, product.Id);
        var reference = "unique-bank-reference-" + Guid.NewGuid();
        (await fixture.Admin.PostAsJsonAsync("/api/payments/manual-settlements", new RecordSettlement(first.Id, 10, "USD", reference))).EnsureSuccessStatusCode();
        var duplicate = await fixture.Admin.PostAsJsonAsync("/api/payments/manual-settlements", new RecordSettlement(second.Id, 10, "USD", reference));
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);
        Assert.Equal("PendingPayment", (await fixture.Buyer.GetFromJsonAsync<OrderDto>($"/api/orders/{second.Id}"))!.Status);
        Assert.Equal(HttpStatusCode.NotFound, (await fixture.Buyer.GetAsync($"/api/orders/{second.Id}/payment")).StatusCode);
        // Successful release proves the failed settlement did not consume its reservation.
        (await fixture.Buyer.PostAsync($"/api/orders/{second.Id}/cancel", null)).EnsureSuccessStatusCode();
        Assert.Equal(4, await Stock(product.Id));
    }

    [Fact]
    public async Task Invalid_input_and_unauthenticated_writes_are_rejected()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await fixture.Anonymous.GetAsync("/api/cart")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await fixture.Buyer.PostAsJsonAsync("/api/categories", new CreateCategory("Forbidden"))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await fixture.Anonymous.GetAsync("/api/products?page=0&size=1000")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await fixture.Anonymous.PostAsJsonAsync("/api/auth/register", new Register("bad", "short"))).StatusCode);
    }

    [Fact]
    public async Task Failed_logins_persist_lockout()
    {
        using var account = await fixture.Register("lockout@example.com");
        for (var i = 0; i < 5; i++)
            Assert.Equal(HttpStatusCode.Unauthorized, (await fixture.Anonymous.PostAsJsonAsync("/api/auth/login", new Login("lockout@example.com", "WrongPassword!123"))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await fixture.Anonymous.PostAsJsonAsync("/api/auth/login", new Login("lockout@example.com", "TestPassword!123"))).StatusCode);
    }

    [Fact]
    public async Task All_contexts_have_current_migrations_and_own_their_schema()
    {
        await using var scope = fixture.Services.CreateAsyncScope();
        var sessions = scope.ServiceProvider.GetRequiredService<IEnumerable<IModuleSession>>().ToArray();
        Assert.Equal(7, sessions.Length);
        foreach (var session in sessions)
        {
            var context = session.Context;
            Assert.False(context.Database.HasPendingModelChanges());
            Assert.NotEmpty(await context.Database.GetAppliedMigrationsAsync());
            var schema = context.Model.GetDefaultSchema();
            Assert.NotNull(schema);
            Assert.All(context.Model.GetEntityTypes(), entity => Assert.Equal(schema, entity.GetSchema()));
        }
    }
}
