using EcommercePlatform.BuildingBlocks.Infrastructure;
using EcommercePlatform.Modules.Pricing.Application;
using Microsoft.Extensions.DependencyInjection;

namespace EcommercePlatform.Modules.Pricing.Infrastructure;
public static class Registration
{
    public static IServiceCollection AddPricingModule(this IServiceCollection services)
    {
        services.AddModuleContext<PricingDbContext>("pricing");
        services.AddScoped<IPricingStore, PricingStore>();
        services.AddScoped<IPricing, PricingService>();
        return services;
    }
}
