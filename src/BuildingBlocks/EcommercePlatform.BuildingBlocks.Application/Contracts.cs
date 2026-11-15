using MediatR;
using EcommercePlatform.BuildingBlocks.Domain;

namespace EcommercePlatform.BuildingBlocks.Application;
public interface ICommand;
public interface ICommand<out T> : IRequest<T>, ICommand;
public interface ICurrentUser
{
    Guid RequireId();
}

public interface ITransactionRunner
{
    Task<T> Run<T>(Func<Task<T>> action, CancellationToken ct);
}

public interface ITransactionEffects
{
    void OnRollback(Func<CancellationToken, Task> action);
}

public sealed record DomainNotification<T>(T Event) : INotification where T : IDomainEvent;
public sealed record Page<T>(IReadOnlyList<T> Items, int Number, int Size, int Total);
