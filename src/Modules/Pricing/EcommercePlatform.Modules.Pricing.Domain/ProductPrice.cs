using EcommercePlatform.BuildingBlocks.Domain;

namespace EcommercePlatform.Modules.Pricing.Domain;
public sealed class ProductPrice : AggregateRoot
{
    public Guid ProductId { get; private set; }
    public Money Price { get; private set; } = null!;

    private ProductPrice()
    {
    }

    public ProductPrice(Guid productId, Money price)
    {
        ProductId = Guard.Id(productId);
        Set(price);
    }

    public void Set(Money price)
    {
        if (price.Amount <= 0)
            throw new DomainException("Price must be positive.");
        Price = price;
    }
}
