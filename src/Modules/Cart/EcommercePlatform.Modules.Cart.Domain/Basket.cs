using EcommercePlatform.BuildingBlocks.Domain;

namespace EcommercePlatform.Modules.Cart.Domain;
public sealed class Basket : AggregateRoot
{
    private readonly List<BasketLine> lines = [];
    public Guid CustomerId { get; private set; }
    public Guid Version { get; private set; } = Guid.NewGuid();
    public IReadOnlyCollection<BasketLine> Lines => lines.AsReadOnly();

    private Basket()
    {
    }

    public Basket(Guid customerId)
    {
        CustomerId = Guard.Id(customerId);
    }

    public void Set(Guid productId, int quantity)
    {
        Guard.Id(productId);
        if (quantity < 0 || quantity > 1000000)
            throw new DomainException("Invalid quantity.");
        var line = lines.SingleOrDefault(x => x.ProductId == productId);
        if (quantity == 0)
        {
            if (line is not null)
                lines.Remove(line);
        }
        else if (line is not null)
            line.Set(quantity);
        else
        {
            if (lines.Count >= 100)
                throw new DomainException("Cart is limited to 100 product lines.");
            lines.Add(new BasketLine(Id, productId, quantity));
        }

        Version = Guid.NewGuid();
    }

    public void Clear()
    {
        lines.Clear();
        Version = Guid.NewGuid();
    }
}

public sealed class BasketLine : Entity
{
    public Guid BasketId { get; private set; }
    public Guid ProductId { get; private set; }
    public int Quantity { get; private set; }

    private BasketLine()
    {
    }

    internal BasketLine(Guid basketId, Guid productId, int quantity)
    {
        BasketId = basketId;
        ProductId = productId;
        Set(quantity);
    }

    internal void Set(int quantity) => Quantity = Guard.Quantity(quantity);
}
