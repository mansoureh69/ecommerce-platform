using EcommercePlatform.BuildingBlocks.Infrastructure;
using EcommercePlatform.Modules.Cart.Application;
using Microsoft.Extensions.DependencyInjection;

namespace EcommercePlatform.Modules.Cart.Infrastructure;
public static class Registration
{
    public static IServiceCollection AddCartModule(this IServiceCollection services)
    {
        services.AddModuleContext<CartDbContext>("cart");
        services.AddScoped<ICartStore, CartStore>();
        services.AddScoped<ICart, CartService>();
        return services;
    }
}
