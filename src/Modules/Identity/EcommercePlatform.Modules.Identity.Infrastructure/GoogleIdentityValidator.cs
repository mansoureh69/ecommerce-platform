using EcommercePlatform.Modules.Identity.Application;
using Google.Apis.Auth;
using Microsoft.Extensions.Options;

namespace EcommercePlatform.Modules.Identity.Infrastructure;
public sealed class GoogleSettings
{
    /// <summary>OAuth client id of the storefront (public value). Empty disables Google sign-in.</summary>
    public string ClientId { get; set; } = "";
}

public sealed class GoogleIdentityValidator(IOptions<GoogleSettings> options) : IGoogleIdentity
{
    public async Task<GoogleIdentity?> Validate(string idToken, CancellationToken ct)
    {
        var clientId = options.Value.ClientId;
        if (string.IsNullOrWhiteSpace(clientId))
            return null;
        try
        {
            // Verifies signature against Google's keys, issuer, expiry and that the audience is our client id.
            var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, new GoogleJsonWebSignature.ValidationSettings { Audience = [clientId] });
            return payload.EmailVerified && !string.IsNullOrWhiteSpace(payload.Email) ? new(payload.Subject, payload.Email) : null;
        }
        // Malformed input surfaces as a JSON/format error rather than InvalidJwtException; neither is a server fault.
        // Network failures while fetching Google's keys are deliberately not caught: that is an outage, not a bad token.
        catch (Exception e) when (e is InvalidJwtException or Newtonsoft.Json.JsonException or FormatException or ArgumentException)
        {
            return null;
        }
    }
}
