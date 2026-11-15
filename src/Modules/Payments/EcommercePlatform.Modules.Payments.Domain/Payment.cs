using EcommercePlatform.BuildingBlocks.Domain;

namespace EcommercePlatform.Modules.Payments.Domain;
public sealed class Payment : AggregateRoot
{
    public Guid OrderId { get; private set; }
    public Money Amount { get; private set; } = null!;
    public string SettlementReference { get; private set; } = "";
    public Guid RecordedBy { get; private set; }
    public DateTimeOffset SettledAt { get; private set; }
    public string? RefundReference { get; private set; }
    public Guid? RefundedBy { get; private set; }
    public DateTimeOffset? RefundedAt { get; private set; }

    private Payment()
    {
    }

    public Payment(Guid orderId, Money amount, string reference, Guid actor)
    {
        OrderId = Guard.Id(orderId);
        RecordedBy = Guard.Id(actor);
        Amount = amount;
        if (amount.Amount <= 0)
            throw new DomainException("Settlement must be positive.");
        SettlementReference = Guard.Text(reference, 200, nameof(reference));
        SettledAt = DateTimeOffset.UtcNow;
        Raise(new PaymentRecorded(Id, OrderId));
    }

    public void Refund(string reference, Guid actor)
    {
        reference = Guard.Text(reference, 200, nameof(reference));
        Guard.Id(actor);
        if (RefundReference is not null)
        {
            if (RefundReference != reference)
                throw new ConflictException("Payment is already refunded.");
            return;
        }

        RefundReference = reference;
        RefundedBy = actor;
        RefundedAt = DateTimeOffset.UtcNow;
    }
}

public sealed record PaymentRecorded(Guid PaymentId, Guid OrderId) : DomainEvent;
