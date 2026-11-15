using EcommercePlatform.BuildingBlocks.Domain;

namespace EcommercePlatform.Modules.Orders.Domain;
public sealed record ShippingAddress
{
    public string Recipient { get; private set; } = "";
    public string Street { get; private set; } = "";
    public string City { get; private set; } = "";
    public string PostalCode { get; private set; } = "";
    public string Country { get; private set; } = "";

    private ShippingAddress()
    {
    }

    public ShippingAddress(string recipient, string street, string city, string postalCode, string country)
    {
        Recipient = Guard.Text(recipient, 200, nameof(recipient));
        Street = Guard.Text(street, 200, nameof(street));
        City = Guard.Text(city, 100, nameof(city));
        PostalCode = Guard.Text(postalCode, 30, nameof(postalCode));
        Country = Guard.Text(country, 100, nameof(country));
    }
}

public sealed record LineSnapshot(Guid ProductId, string Name, Money UnitPrice, int Quantity);
public enum OrderStatus
{
    PendingPayment,
    Paid,
    Shipped,
    Delivered,
    Cancelled,
    Refunded
}

public sealed class Order : AggregateRoot
{
    private readonly List<OrderLine> lines = [];
    public Guid CustomerId { get; private set; }
    public Guid CheckoutKey { get; private set; }
    public string RequestHash { get; private set; } = "";
    public ShippingAddress Shipping { get; private set; } = null!;
    public OrderStatus Status { get; private set; } = OrderStatus.PendingPayment;
    public Money Total { get; private set; } = null!;
    public IReadOnlyCollection<OrderLine> Lines => lines.AsReadOnly();

    private Order()
    {
    }

    public Order(Guid customerId, Guid checkoutKey, string requestHash, ShippingAddress shipping, IReadOnlyList<LineSnapshot> snapshots)
    {
        CustomerId = Guard.Id(customerId);
        CheckoutKey = Guard.Id(checkoutKey);
        RequestHash = Guard.Text(requestHash, 64, nameof(requestHash));
        Shipping = shipping ?? throw new DomainException("Shipping address is required.");
        if (snapshots.Count is 0 or > 100 || snapshots.Select(x => x.ProductId).Distinct().Count() != snapshots.Count)
            throw new DomainException("Order requires 1-100 distinct product lines.");
        Total = new Money(0, snapshots[0].UnitPrice.Currency);
        foreach (var snapshot in snapshots)
        {
            var line = new OrderLine(Id, snapshot);
            lines.Add(line);
            Total = Total.Add(snapshot.UnitPrice.Multiply(snapshot.Quantity));
        }

        if (Total.Amount <= 0)
            throw new DomainException("Order total must be positive.");
        Raise(new OrderPlaced(Id, CustomerId));
    }

    public void MarkPaid()
    {
        Require(OrderStatus.PendingPayment);
        Status = OrderStatus.Paid;
        Raise(new OrderPaid(Id));
    }

    public void Cancel()
    {
        Require(OrderStatus.PendingPayment);
        Status = OrderStatus.Cancelled;
        Raise(new OrderCancelled(Id));
    }

    public void Ship()
    {
        Require(OrderStatus.Paid);
        Status = OrderStatus.Shipped;
    }

    public void Deliver()
    {
        Require(OrderStatus.Shipped);
        Status = OrderStatus.Delivered;
    }

    public void Refund()
    {
        Require(OrderStatus.Paid);
        Status = OrderStatus.Refunded;
        Raise(new OrderRefunded(Id));
    }

    private void Require(OrderStatus status)
    {
        if (Status != status)
            throw new ConflictException($"Order must be {status} for this operation.");
    }
}

public sealed class OrderLine : Entity
{
    public Guid OrderId { get; private set; }
    public Guid ProductId { get; private set; }
    public string Name { get; private set; } = "";
    public Money UnitPrice { get; private set; } = null!;
    public int Quantity { get; private set; }

    private OrderLine()
    {
    }

    internal OrderLine(Guid orderId, LineSnapshot line)
    {
        OrderId = orderId;
        ProductId = Guard.Id(line.ProductId);
        Name = Guard.Text(line.Name, 200, nameof(line.Name));
        UnitPrice = line.UnitPrice;
        Quantity = Guard.Quantity(line.Quantity);
    }
}

public sealed record OrderPlaced(Guid OrderId, Guid CustomerId) : DomainEvent;
public sealed record OrderPaid(Guid OrderId) : DomainEvent;
public sealed record OrderCancelled(Guid OrderId) : DomainEvent;
public sealed record OrderRefunded(Guid OrderId) : DomainEvent;
