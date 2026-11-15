using EcommercePlatform.BuildingBlocks.Infrastructure;
using EcommercePlatform.Modules.Payments.Application;
using Microsoft.Extensions.DependencyInjection;

namespace EcommercePlatform.Modules.Payments.Infrastructure;
public static class Registration
{
    public static IServiceCollection AddPaymentsModule(this IServiceCollection services)
    {
        services.AddModuleContext<PaymentsDbContext>("payments");
        services.AddScoped<IPaymentStore, PaymentStore>();
        return services;
    }
}
