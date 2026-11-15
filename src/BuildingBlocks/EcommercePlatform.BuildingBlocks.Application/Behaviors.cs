using FluentValidation;
using MediatR;

namespace EcommercePlatform.BuildingBlocks.Application;
public sealed class ValidationBehavior<TRequest, TResponse>(IEnumerable<IValidator<TRequest>> validators) : IPipelineBehavior<TRequest, TResponse> where TRequest : notnull
{
    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        var failures = new List<FluentValidation.Results.ValidationFailure>();
        foreach (var validator in validators)
            failures.AddRange((await validator.ValidateAsync(request, ct)).Errors);
        if (failures.Count > 0)
            throw new ValidationException(failures);
        return await next();
    }
}

public sealed class TransactionBehavior<TRequest, TResponse>(ITransactionRunner runner) : IPipelineBehavior<TRequest, TResponse> where TRequest : notnull
{
    public Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct) => request is ICommand ? runner.Run(() => next(), ct) : next();
}
