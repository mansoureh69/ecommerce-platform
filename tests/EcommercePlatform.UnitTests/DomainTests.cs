using EcommercePlatform.BuildingBlocks.Domain;
using EcommercePlatform.Modules.Catalog.Domain;
using EcommercePlatform.Modules.Cart.Domain;
using EcommercePlatform.Modules.Inventory.Domain;
using EcommercePlatform.Modules.Orders.Domain;
using EcommercePlatform.Modules.Payments.Domain;
using EcommercePlatform.Modules.Pricing.Domain;
using EcommercePlatform.Modules.Identity.Domain;

namespace EcommercePlatform.UnitTests;
public sealed class DomainTests
{
    [Theory]
    [InlineData(-1, "USD")]
    [InlineData(1.001, "USD")]
    [InlineData(1.1, "IRR")]
    [InlineData(1, "XYZ")]
    public void Money_rejects_invalid_amounts_and_currency(decimal amount, string currency) => Assert.Throws<DomainException>(() => new Money(amount, currency));
    [Fact]
    public void Money_does_not_mix_currencies() => Assert.Throws<DomainException>(() => new Money(1, "USD").Add(new Money(1, "EUR")));
    [Fact]
    public void Currency_precision_is_explicit()
    {
        Assert.Equal(1.001m, new Money(1.001m, "KWD").Amount);
        Assert.Equal("IRR", new Money(100, "irr").Currency);
    }

    [Fact]
    public void Stock_reservation_is_idempotent_and_cannot_oversell()
    {
        var s = new Stock(Guid.NewGuid());
        s.Receive(3);
        var order = Guid.NewGuid();
        s.Reserve(order, 2);
        s.Reserve(order, 2);
        Assert.Equal(1, s.Available);
        Assert.Throws<ConflictException>(() => s.Reserve(Guid.NewGuid(), 2));
        Assert.Throws<ConflictException>(() => s.Reserve(order, 1));
        s.Release(order);
        s.Release(order);
        Assert.Equal(3, s.Available);
        Assert.Throws<ConflictException>(() => s.Consume(order));
    }

    [Fact]
    public void Consumed_stock_cannot_be_released()
    {
        var s = new Stock(Guid.NewGuid());
        s.Receive(2);
        var id = Guid.NewGuid();
        s.Reserve(id, 2);
        s.Consume(id);
        s.Consume(id);
        Assert.Throws<ConflictException>(() => s.Release(id));
    }

    [Fact]
    public void Cart_quantity_is_replaced_and_zero_removes_line()
    {
        var b = new Basket(Guid.NewGuid());
        var p = Guid.NewGuid();
        var version = b.Version;
        b.Set(p, 2);
        b.Set(p, 3);
        Assert.Single(b.Lines);
        Assert.Equal(3, b.Lines.Single().Quantity);
        Assert.NotEqual(version, b.Version);
        b.Set(p, 0);
        Assert.Empty(b.Lines);
        Assert.Throws<DomainException>(() => b.Set(p, -1));
    }

    [Fact]
    public void Order_snapshots_and_lifecycle_are_enforced()
    {
        var o = Order();
        Assert.Equal(20, o.Total.Amount);
        Assert.Single(o.DomainEvents);
        Assert.Throws<ConflictException>(() => o.Ship());
        o.MarkPaid();
        o.Ship();
        o.Deliver();
        Assert.Equal(OrderStatus.Delivered, o.Status);
        Assert.Throws<ConflictException>(() => o.Cancel());
    }

    [Fact]
    public void Empty_and_mixed_currency_orders_are_rejected()
    {
        Assert.Throws<DomainException>(() => new Order(Guid.NewGuid(), Guid.NewGuid(), "hash", Address(), []));
        Assert.Throws<DomainException>(() => new Order(Guid.NewGuid(), Guid.NewGuid(), "hash", Address(), [new(Guid.NewGuid(), "A", new(1, "USD"), 1), new(Guid.NewGuid(), "B", new(1, "EUR"), 1)]));
    }

    [Fact]
    public void Settlement_requires_positive_amount_and_refund_is_idempotent()
    {
        Assert.Throws<DomainException>(() => new Payment(Guid.NewGuid(), new(0, "USD"), "ref", Guid.NewGuid()));
        var p = new Payment(Guid.NewGuid(), new(20, "USD"), "ref", Guid.NewGuid());
        p.Refund("refund", Guid.NewGuid());
        p.Refund("refund", Guid.NewGuid());
        Assert.NotNull(p.RefundedAt);
        Assert.Throws<ConflictException>(() => p.Refund("different", Guid.NewGuid()));
    }

    [Fact]
    public void Catalog_price_and_account_invariants_are_enforced()
    {
        var p = new Product(" sku ", "Generic product", "Description", Guid.NewGuid());
        Assert.Equal("SKU", p.Sku);
        p.Update("Renamed", "", false);
        Assert.False(p.Active);
        Assert.Throws<DomainException>(() => new ProductPrice(p.Id, new(0, "USD")));
        Assert.Equal("person@example.com", new AccountEmail(" Person@example.com ").Value);
        Assert.Throws<DomainException>(() => new AccountEmail("invalid"));
    }

    private static ShippingAddress Address() => new("Customer", "Street", "City", "123", "Country");
    private static Order Order() => new(Guid.NewGuid(), Guid.NewGuid(), "hash", Address(), [new(Guid.NewGuid(), "Product", new(10, "USD"), 2)]);
}
