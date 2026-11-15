using EcommercePlatform.BuildingBlocks.Infrastructure;
using EcommercePlatform.Modules.Orders.Application;
using Microsoft.Extensions.DependencyInjection;

namespace EcommercePlatform.Modules.Orders.Infrastructure;
public static class Registration
{
    public static IServiceCollection AddOrdersModule(this IServiceCollection services)
    {
        services.AddModuleContext<OrdersDbContext>("orders");
        services.AddScoped<IOrderStore, OrderStore>();
        services.AddScoped<IOrders, OrdersService>();
        return services;
    }
}
