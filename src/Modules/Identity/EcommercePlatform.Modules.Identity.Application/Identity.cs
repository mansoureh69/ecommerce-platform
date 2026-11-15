using EcommercePlatform.BuildingBlocks.Application;
using FluentValidation;
using MediatR;

namespace EcommercePlatform.Modules.Identity.Application;
public sealed record AuthResult(bool Success, string? Token, DateTimeOffset? ExpiresAt, string? Error);
public sealed record Register(string Email, string Password) : ICommand<AuthResult>;
public sealed record Login(string Email, string Password) : ICommand<AuthResult>;
public sealed record GoogleLogin(string IdToken) : ICommand<AuthResult>;
/// <summary>An already-verified Google identity: the token's audience, issuer, signature, expiry and verified email were checked.</summary>
public sealed record GoogleIdentity(string Subject, string Email);
public interface IGoogleIdentity
{
    /// <summary>Returns null when Google sign-in is disabled or the token is not valid for this application.</summary>
    Task<GoogleIdentity?> Validate(string idToken, CancellationToken ct);
}
public interface IAccounts
{
    Task<AuthResult> Register(string email, string password, CancellationToken ct);
    Task<AuthResult> Login(string email, string password, CancellationToken ct);
    Task<AuthResult> ExternalLogin(string provider, string subject, string email, CancellationToken ct);
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

public sealed class GoogleLoginValidator : AbstractValidator<GoogleLogin>
{
    public GoogleLoginValidator()
    {
        RuleFor(x => x.IdToken).NotEmpty().MaximumLength(4096);
    }
}

public sealed class IdentityHandlers(IAccounts accounts, IGoogleIdentity google) : IRequestHandler<Register, AuthResult>, IRequestHandler<Login, AuthResult>, IRequestHandler<GoogleLogin, AuthResult>
{
    public Task<AuthResult> Handle(Register r, CancellationToken ct) => accounts.Register(r.Email, r.Password, ct);
    public Task<AuthResult> Handle(Login r, CancellationToken ct) => accounts.Login(r.Email, r.Password, ct);

    public async Task<AuthResult> Handle(GoogleLogin r, CancellationToken ct)
    {
        var identity = await google.Validate(r.IdToken, ct);
        return identity is null
            ? new(false, null, null, "Google sign-in failed.")
            : await accounts.ExternalLogin("Google", identity.Subject, identity.Email, ct);
    }
}
