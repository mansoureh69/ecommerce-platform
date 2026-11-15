using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using EcommercePlatform.Modules.Identity.Application;
using EcommercePlatform.Modules.Identity.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace EcommercePlatform.Modules.Identity.Infrastructure;
public sealed class JwtSettings
{
    public string Secret { get; set; } = "";
    public string Issuer { get; set; } = "EcommercePlatform";
    public string Audience { get; set; } = "EcommercePlatform.Client";
    public int Minutes { get; set; } = 15;
}

internal sealed class Accounts(UserManager<ApplicationUser> users, IOptions<JwtSettings> options, TimeProvider clock) : IAccounts
{
    public async Task<AuthResult> Register(string email, string password, CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();
        var address = new AccountEmail(email);
        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            Email = address.Value,
            UserName = address.Value,
            LockoutEnabled = true
        };
        var result = await users.CreateAsync(user, password);
        if (!result.Succeeded)
            return new(false, null, null, "Registration failed. Check account details and password requirements.");
        return await Token(user);
    }

    public async Task<AuthResult> Login(string email, string password, CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();
        var user = await users.FindByEmailAsync(new AccountEmail(email).Value);
        if (user is null)
            return Failed();
        if (await users.IsLockedOutAsync(user))
            return Failed();
        if (!await users.CheckPasswordAsync(user, password))
        {
            await users.AccessFailedAsync(user);
            return Failed();
        }

        await users.ResetAccessFailedCountAsync(user);
        return await Token(user);
    }

    // A Google account signs in to the account linked to its subject id, or creates a new password-less customer.
    // It is never linked to a pre-existing account by email alone: registration does not verify email ownership,
    // so linking would let whoever pre-registered an address keep access once its real owner signs in with Google.
    public async Task<AuthResult> ExternalLogin(string provider, string subject, string email, CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();
        var address = new AccountEmail(email);
        var user = await users.FindByLoginAsync(provider, subject);
        if (user is null)
        {
            if (await users.FindByEmailAsync(address.Value) is not null)
                return new(false, null, null, "An account with this email already exists. Sign in with your password.");
            user = new ApplicationUser
            {
                Id = Guid.NewGuid(),
                Email = address.Value,
                UserName = address.Value,
                EmailConfirmed = true,
                LockoutEnabled = true
            };
            // Throwing rolls back the surrounding transaction, so a half-created account is never left behind.
            if (!(await users.CreateAsync(user)).Succeeded || !(await users.AddLoginAsync(user, new UserLoginInfo(provider, subject, provider))).Succeeded)
                throw new InvalidOperationException("Could not create the external account.");
        }

        return await users.IsLockedOutAsync(user) ? Failed() : await Token(user);
    }

    private static AuthResult Failed() => new(false, null, null, "Invalid credentials or account locked.");
    private async Task<AuthResult> Token(ApplicationUser user)
    {
        var s = options.Value;
        var now = clock.GetUtcNow();
        var expires = now.AddMinutes(s.Minutes);
        var claims = new List<Claim>
        {
            new("sub", user.Id.ToString()),
            new("jti", Guid.NewGuid().ToString())
        };
        claims.AddRange((await users.GetRolesAsync(user)).Select(role => new Claim("role", role)));
        var token = new JwtSecurityToken(s.Issuer, s.Audience, claims, now.UtcDateTime, expires.UtcDateTime, new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(s.Secret)), SecurityAlgorithms.HmacSha256));
        return new(true, new JwtSecurityTokenHandler().WriteToken(token), expires, null);
    }
}
