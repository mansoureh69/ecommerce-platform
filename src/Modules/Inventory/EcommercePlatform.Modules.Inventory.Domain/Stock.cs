using EcommercePlatform.BuildingBlocks.Domain;

namespace EcommercePlatform.Modules.Inventory.Domain;
public sealed class Stock : AggregateRoot
{
    private readonly List<Reservation> reservations = [];
    public Guid ProductId { get; private set; }
    public int Available { get; private set; }
    public IReadOnlyCollection<Reservation> Reservations => reservations.AsReadOnly();

    private Stock()
    {
    }

    public Stock(Guid productId)
    {
        ProductId = Guard.Id(productId);
    }

    public void Receive(int quantity)
    {
        Available = checked(Available + Guard.Quantity(quantity));
    }

    public void Reserve(Guid orderId, int quantity)
    {
        Guard.Id(orderId);
        Guard.Quantity(quantity);
        var existing = reservations.SingleOrDefault(x => x.OrderId == orderId);
        if (existing is not null)
        {
            if (existing.Quantity != quantity || existing.State != "Reserved")
                throw new ConflictException("Reservation differs from the original request.");
            return;
        }

        if (quantity > Available)
            throw new ConflictException("Insufficient stock.");
        Available -= quantity;
        reservations.Add(new Reservation(Id, orderId, quantity));
    }

    public void Release(Guid orderId)
    {
        var r = Find(orderId);
        if (r.State == "Released")
            return;
        if (r.State != "Reserved")
            throw new ConflictException("Consumed inventory cannot be released.");
        Available = checked(Available + r.Quantity);
        r.Change("Released");
    }

    public void Consume(Guid orderId)
    {
        var r = Find(orderId);
        if (r.State == "Consumed")
            return;
        if (r.State != "Reserved")
            throw new ConflictException("Reservation is not active.");
        r.Change("Consumed");
    }

    private Reservation Find(Guid orderId) => reservations.SingleOrDefault(x => x.OrderId == orderId) ?? throw new KeyNotFoundException();
}

public sealed class Reservation : Entity
{
    public Guid StockId { get; private set; }
    public Guid OrderId { get; private set; }
    public int Quantity { get; private set; }
    public string State { get; private set; } = "Reserved";

    private Reservation()
    {
    }

    internal Reservation(Guid stockId, Guid orderId, int quantity)
    {
        StockId = stockId;
        OrderId = orderId;
        Quantity = quantity;
    }

    internal void Change(string state) => State = state;
}
