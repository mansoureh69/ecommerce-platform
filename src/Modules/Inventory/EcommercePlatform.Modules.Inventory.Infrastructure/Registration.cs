using EcommercePlatform.BuildingBlocks.Infrastructure;
using EcommercePlatform.Modules.Inventory.Application;
using Microsoft.Extensions.DependencyInjection;

namespace EcommercePlatform.Modules.Inventory.Infrastructure;
public static class Registration
{
    public static IServiceCollection AddInventoryModule(this IServiceCollection services)
    {
        services.AddModuleContext<InventoryDbContext>("inventory");
        services.AddScoped<IInventoryStore, InventoryStore>();
        services.AddScoped<IInventory, InventoryService>();
        return services;
    }
}
