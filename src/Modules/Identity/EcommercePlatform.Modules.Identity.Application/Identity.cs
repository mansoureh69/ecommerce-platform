using EcommercePlatform.BuildingBlocks.Application;
using FluentValidation;
using MediatR;

namespace EcommercePlatform.Modules.Identity.Application;
public sealed record AuthResult(bool Success, string? Token, DateTimeOffset? ExpiresAt, string? Error);
public sealed record Register(string Email, string Password) : ICommand<AuthResult>;
public sealed record Login(string Email, string Password) : ICommand<AuthResult>;
public interface IAccounts
{
    Task<AuthResult> Register(string email, string password, CancellationToken ct);
    Task<AuthResult> Login(string email, string password, CancellationToken ct);
}

public sealed class RegisterValidator : AbstractValidator<Register>
{
    public RegisterValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(254);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(12).MaximumLength(128);
    }
}

public sealed class LoginValidator : AbstractValidator<Login>
{
    public LoginValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(254);
        RuleFor(x => x.Password).NotEmpty().MaximumLength(128);
    }
}

public sealed class IdentityHandlers(IAccounts accounts) : IRequestHandler<Register, AuthResult>, IRequestHandler<Login, AuthResult>
{
    public Task<AuthResult> Handle(Register r, CancellationToken ct) => accounts.Register(r.Email, r.Password, ct);
    public Task<AuthResult> Handle(Login r, CancellationToken ct) => accounts.Login(r.Email, r.Password, ct);
}
