using System.Text;
using System.Threading.RateLimiting;
using EcommercePlatform.Api;
using EcommercePlatform.BuildingBlocks.Application;
using EcommercePlatform.BuildingBlocks.Infrastructure;
using EcommercePlatform.Modules.Identity.Infrastructure;
using EcommercePlatform.Modules.Catalog.Infrastructure;
using EcommercePlatform.Modules.Pricing.Infrastructure;
using EcommercePlatform.Modules.Inventory.Infrastructure;
using EcommercePlatform.Modules.Cart.Infrastructure;
using EcommercePlatform.Modules.Orders.Infrastructure;
using EcommercePlatform.Modules.Payments.Infrastructure;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddProblemDetails(o => o.CustomizeProblemDetails = c => c.ProblemDetails.Extensions["traceId"] = c.HttpContext.TraceIdentifier);
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddOpenApi();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();
builder.Services.AddSingleton(TimeProvider.System);
var connection = builder.Configuration.GetConnectionString("Database") ?? throw new InvalidOperationException("Configure ConnectionStrings__Database.");
builder.Services.AddScoped(_ => new NpgsqlConnection(connection));
builder.Services.AddScoped<ITransactionRunner, TransactionRunner>();
builder.Services.AddScoped<TransactionEffects>();
builder.Services.AddScoped<ITransactionEffects>(sp => sp.GetRequiredService<TransactionEffects>());
builder.Services.AddIdentityModule().AddCatalogModule(builder.Configuration).AddPricingModule().AddInventoryModule().AddCartModule().AddOrdersModule().AddPaymentsModule();
var assemblies = new[]
{
    typeof(EcommercePlatform.Modules.Identity.Application.Register).Assembly,
    typeof(EcommercePlatform.Modules.Catalog.Application.CreateProduct).Assembly,
    typeof(EcommercePlatform.Modules.Pricing.Application.SetPrice).Assembly,
    typeof(EcommercePlatform.Modules.Inventory.Application.ReceiveStock).Assembly,
    typeof(EcommercePlatform.Modules.Cart.Application.SetCartLine).Assembly,
    typeof(EcommercePlatform.Modules.Orders.Application.Checkout).Assembly,
    typeof(EcommercePlatform.Modules.Payments.Application.RecordSettlement).Assembly
};
builder.Services.AddMediatR(c =>
{
    c.RegisterServicesFromAssemblies(assemblies);
    c.AddOpenBehavior(typeof(LoggingBehavior<, >));
    c.AddOpenBehavior(typeof(ValidationBehavior<, >));
    c.AddOpenBehavior(typeof(TransactionBehavior<, >));
});
foreach (var assembly in assemblies)
    builder.Services.AddValidatorsFromAssembly(assembly);
builder.Services.AddIdentityCore<ApplicationUser>(o =>
{
    o.User.RequireUniqueEmail = true;
    o.Password.RequiredLength = 12;
    o.Lockout.MaxFailedAccessAttempts = 5;
    o.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
}).AddRoles<IdentityRole<Guid>>().AddEntityFrameworkStores<IdentityDbContext>();
builder.Services.AddOptions<JwtSettings>().BindConfiguration("Jwt").Validate(s => Encoding.UTF8.GetByteCount(s.Secret) >= 32 && !string.IsNullOrWhiteSpace(s.Issuer) && !string.IsNullOrWhiteSpace(s.Audience) && s.Minutes is >= 1 and <= 60, "Jwt requires a 32-byte secret, issuer, audience and 1-60 minute lifetime.").ValidateOnStart();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme).Configure<Microsoft.Extensions.Options.IOptions<JwtSettings>>((o, settings) =>
{
    var s = settings.Value;
    o.MapInboundClaims = false;
    o.TokenValidationParameters = new()
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = s.Issuer,
        ValidAudience = s.Audience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(s.Secret)),
        ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
        NameClaimType = "sub",
        RoleClaimType = "role",
        ClockSkew = TimeSpan.FromSeconds(15)
    };
});
builder.Services.AddAuthorization(o => o.AddPolicy("Admin", p => p.RequireRole("Admin")));
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = 429;
    o.AddPolicy("auth", context => RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new() { PermitLimit = 20, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
});
builder.Services.AddHealthChecks().AddCheck<DatabaseHealthCheck>("database", tags: ["ready"]);
var app = builder.Build();
if (args.Contains("--migrate"))
{
    await using var scope = app.Services.CreateAsyncScope();
    foreach (var session in scope.ServiceProvider.GetRequiredService<IEnumerable<IModuleSession>>())
        await session.Context.Database.MigrateAsync();
    return;
}

if (args.Contains("--create-admin"))
{
    await AdminBootstrap.Run(app.Services, builder.Configuration);
    return;
}

app.UseExceptionHandler();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
if (app.Environment.IsDevelopment())
    app.MapOpenApi();
app.MapHealthChecks("/health/live", new() { Predicate = _ => false });
app.MapHealthChecks("/health/ready", new() { Predicate = c => c.Tags.Contains("ready") });
app.MapCommerce();
app.Run();
public partial class Program;
