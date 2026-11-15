using EcommercePlatform.BuildingBlocks.Infrastructure;
using EcommercePlatform.Modules.Identity.Application;
using Microsoft.Extensions.DependencyInjection;

namespace EcommercePlatform.Modules.Identity.Infrastructure;
public static class Registration
{
    public static IServiceCollection AddIdentityModule(this IServiceCollection services)
    {
        services.AddModuleContext<IdentityDbContext>("identity");
        services.AddScoped<IAccounts, Accounts>();
        services.AddOptions<GoogleSettings>().BindConfiguration("Google");
        services.AddSingleton<IGoogleIdentity, GoogleIdentityValidator>();
        return services;
    }
}
