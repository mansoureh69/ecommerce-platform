using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Json;
using EcommercePlatform.Modules.Identity.Application;

namespace EcommercePlatform.IntegrationTests;

/// <summary>Stands in for Google's verification. Token format: "valid|subject|email"; anything else is rejected.</summary>
internal sealed class FakeGoogleIdentity : IGoogleIdentity
{
    public Task<GoogleIdentity?> Validate(string idToken, CancellationToken ct)
    {
        var parts = idToken.Split('|');
        return Task.FromResult(parts is ["valid", var subject, var email] ? new GoogleIdentity(subject, email) : null);
    }
}

public sealed class GoogleSignInTests(CommerceFixture fixture) : IClassFixture<CommerceFixture>
{
    private static string Unique() => Guid.NewGuid().ToString("N");
    private Task<HttpResponseMessage> Google(string token) => fixture.Anonymous.PostAsJsonAsync("/api/auth/google", new { idToken = token });
    private static JwtSecurityToken Read(AuthResult result) => new JwtSecurityTokenHandler().ReadJwtToken(result.Token);

    [Fact]
    public async Task New_google_user_gets_a_customer_session_and_the_same_account_on_return()
    {
        var subject = Unique();
        var token = $"valid|{subject}|g-{subject}@example.test";
        var first = await Google(token);
        first.EnsureSuccessStatusCode();
        var firstResult = (await first.Content.ReadFromJsonAsync<AuthResult>())!;
        Assert.True(firstResult.Success);
        Assert.DoesNotContain(Read(firstResult).Claims, c => c.Type == "role");

        var second = (await (await Google(token)).Content.ReadFromJsonAsync<AuthResult>())!;
        Assert.Equal(Read(firstResult).Subject, Read(second).Subject);

        using var customer = fixture.Client(firstResult.Token!);
        Assert.Equal(HttpStatusCode.OK, (await customer.GetAsync("/api/cart")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await customer.GetAsync("/api/admin/orders")).StatusCode);
    }

    [Fact]
    public async Task Invalid_google_token_is_rejected()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await Google("forged")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Google("")).StatusCode);
    }

    [Fact]
    public async Task Google_never_takes_over_an_existing_password_account()
    {
        var email = $"existing-{Unique()}@example.test";
        await fixture.Register(email);
        var response = await Google($"valid|{Unique()}|{email}");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Contains("already exists", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Google_accounts_have_no_password_login()
    {
        var subject = Unique();
        var email = $"g-{subject}@example.test";
        (await Google($"valid|{subject}|{email}")).EnsureSuccessStatusCode();
        var password = await fixture.Anonymous.PostAsJsonAsync("/api/auth/login", new { email, password = "Not-The-Password-1!" });
        Assert.Equal(HttpStatusCode.Unauthorized, password.StatusCode);
    }
}
