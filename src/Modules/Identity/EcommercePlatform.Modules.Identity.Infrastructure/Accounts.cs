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
