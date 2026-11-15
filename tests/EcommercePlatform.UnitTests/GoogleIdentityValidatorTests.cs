using EcommercePlatform.Modules.Identity.Infrastructure;
using Microsoft.Extensions.Options;

namespace EcommercePlatform.UnitTests;
public sealed class GoogleIdentityValidatorTests
{
    private static GoogleIdentityValidator Validator(string clientId) => new(Options.Create(new GoogleSettings { ClientId = clientId }));

    [Theory]
    [InlineData("forged.token.value")]
    [InlineData("garbage")]
    [InlineData("a.b.c")]
    [InlineData("eyJhbGciOiJSUzI1NiJ9.e30.sig")]
    public async Task Malformed_tokens_are_rejected_without_throwing(string token) =>
        Assert.Null(await Validator("client.apps.googleusercontent.com").Validate(token, CancellationToken.None));

    [Fact]
    public async Task Google_sign_in_is_off_until_a_client_id_is_configured() =>
        Assert.Null(await Validator("").Validate("eyJhbGciOiJSUzI1NiJ9.e30.sig", CancellationToken.None));
}
