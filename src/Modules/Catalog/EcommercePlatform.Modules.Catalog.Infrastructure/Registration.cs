using EcommercePlatform.BuildingBlocks.Infrastructure;
using EcommercePlatform.Modules.Catalog.Application;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Amazon.Runtime;
using Amazon.S3;

namespace EcommercePlatform.Modules.Catalog.Infrastructure;
public static class Registration
{
    public static IServiceCollection AddCatalogModule(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddModuleContext<CatalogDbContext>("catalog");
        services.AddScoped<ICatalogStore, CatalogStore>();
        services.AddScoped<ICatalog, CatalogService>();
        services.AddScoped<IProductImageProcessor, ProductImageProcessor>();
        services.AddOptions<MediaStorageOptions>().Bind(configuration.GetSection(MediaStorageOptions.Section)).Validate(x => x.Provider is "Local" or "S3", "Catalog media provider must be Local or S3.").ValidateOnStart();
        var options = configuration.GetSection(MediaStorageOptions.Section).Get<MediaStorageOptions>() ?? new();
        if (options.Provider == "S3")
        {
            if (string.IsNullOrWhiteSpace(options.AccessKey) || string.IsNullOrWhiteSpace(options.SecretKey) || string.IsNullOrWhiteSpace(options.Bucket) || string.IsNullOrWhiteSpace(options.ServiceUrl))
                throw new InvalidOperationException("S3 catalog storage requires a service URL, bucket and credentials.");
            services.AddSingleton<IAmazonS3>(_ => new AmazonS3Client(new BasicAWSCredentials(options.AccessKey, options.SecretKey), new AmazonS3Config { ServiceURL = options.ServiceUrl, ForcePathStyle = options.ForcePathStyle }));
            services.AddScoped<IObjectStorage, S3ObjectStorage>();
        }
        else
            services.AddScoped<IObjectStorage, LocalObjectStorage>();
        return services;
    }
}
