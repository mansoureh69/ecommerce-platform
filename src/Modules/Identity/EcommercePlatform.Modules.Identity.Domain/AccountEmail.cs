using System.Net.Mail;
using EcommercePlatform.BuildingBlocks.Domain;

namespace EcommercePlatform.Modules.Identity.Domain;
public sealed record AccountEmail
{
    public string Value { get; }

    public AccountEmail(string email)
    {
        var value = Guard.Text(email, 254, nameof(email));
        if (!MailAddress.TryCreate(value, out var address) || address.Address != value)
            throw new DomainException("Invalid email address.");
        Value = value.ToLowerInvariant();
    }
}

public static class Roles
{
    public const string Admin = "Admin";
}
