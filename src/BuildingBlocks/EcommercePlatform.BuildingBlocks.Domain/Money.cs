namespace EcommercePlatform.BuildingBlocks.Domain;
// Explicit initial currency policy. Extend with reviewed minor-unit rules, never silently round.
public sealed record Money
{
    public decimal Amount { get; private set; }
    public string Currency { get; private set; } = "";

    private Money()
    {
    }

    public Money(decimal amount, string currency)
    {
        Currency = Guard.Text(currency, 3, nameof(currency)).ToUpperInvariant();
        var digits = Currency switch
        {
            "USD" or "EUR" or "GBP" => 2,
            "IRR" or "JPY" => 0,
            "KWD" => 3,
            _ => throw new DomainException("Unsupported currency.")};
        if (amount < 0 || amount > 1000000000000m || decimal.Round(amount, digits) != amount)
            throw new DomainException("Invalid monetary amount or minor-unit precision.");
        Amount = amount;
    }

    public Money Add(Money other) => Currency == other.Currency ? new(checked(Amount + other.Amount), Currency) : throw new DomainException("Currencies must match.");
    public Money Multiply(int quantity) => new(checked(Amount * Guard.Quantity(quantity)), Currency);
}
