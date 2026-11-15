namespace EcommercePlatform.BuildingBlocks.Domain;
public class DomainException(string message) : Exception(message);
public sealed class ConflictException(string message) : DomainException(message);
public interface IDomainEvent
{
    Guid EventId { get; }

    DateTimeOffset OccurredAt { get; }
}

public abstract record DomainEvent : IDomainEvent
{
    public Guid EventId { get; init; } = Guid.NewGuid();
    public DateTimeOffset OccurredAt { get; init; } = DateTimeOffset.UtcNow;
}

public abstract class Entity
{
    public Guid Id { get; protected set; } = Guid.NewGuid();

    public override bool Equals(object? obj) => obj is Entity other && GetType() == other.GetType() && Id == other.Id;
    public override int GetHashCode() => HashCode.Combine(GetType(), Id);
}

public abstract class AggregateRoot : Entity
{
    private readonly List<IDomainEvent> events = [];
    public IReadOnlyCollection<IDomainEvent> DomainEvents => events.AsReadOnly();

    protected void Raise(IDomainEvent domainEvent) => events.Add(domainEvent);
    public void ClearDomainEvents() => events.Clear();
}

public static class Guard
{
    public static string Text(string? value, int max, string name)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Trim().Length > max)
            throw new DomainException($"{name} is required and must not exceed {max} characters.");
        return value.Trim();
    }

    public static Guid Id(Guid value) => value != Guid.Empty ? value : throw new DomainException("A nonempty identifier is required.");
    public static int Quantity(int value) => value is> 0 and <= 1000000 ? value : throw new DomainException("Quantity must be between 1 and 1000000.");
}
