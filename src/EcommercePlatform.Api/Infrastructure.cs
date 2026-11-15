using EcommercePlatform.BuildingBlocks.Application;
using EcommercePlatform.BuildingBlocks.Domain;
using EcommercePlatform.Modules.Identity.Domain;
using EcommercePlatform.Modules.Identity.Infrastructure;
using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Npgsql;

namespace EcommercePlatform.Api;
public sealed class CurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    public Guid RequireId() => Guid.TryParse(accessor.HttpContext?.User.FindFirst("sub")?.Value, out var id) && id != Guid.Empty ? id : throw new UnauthorizedAccessException();
}

public sealed class ApiExceptionHandler(IProblemDetailsService problems, ILogger<ApiExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken ct)
    {
        var status = exception switch
        {
            ValidationException or ArgumentException or BadHttpRequestException => 400,
            UnauthorizedAccessException => 401,
            KeyNotFoundException => 404,
            ConflictException or DbUpdateConcurrencyException => 409,
            DomainException => 422,
            PostgresException p when p.SqlState is "40001" or "40P01" or "23505" => 409,
            DbUpdateException e when e.InnerException is PostgresException p && p.SqlState is "40001" or "40P01" or "23505" => 409,
            _ => 500
        };
        var title = status switch
        {
            400 => "Invalid request",
            401 => "Authentication required",
            404 => "Resource not found",
            409 => "Conflict; reload and retry",
            422 => "Domain rule violation",
            _ => "Unexpected server error"
        };
        ProblemDetails problem = exception is ValidationException validation ? new ValidationProblemDetails(validation.Errors.GroupBy(x => x.PropertyName).ToDictionary(g => g.Key, g => g.Select(x => x.ErrorMessage).Distinct().ToArray())) : new();
        problem.Status = status;
        problem.Title = title;
        if (exception is DomainException)
            problem.Detail = exception.Message;
        if (status == 500)
            logger.LogError(exception, "Request failed with trace {TraceId}", context.TraceIdentifier);
        context.Response.StatusCode = status;
        await problems.WriteAsync(new() { HttpContext = context, ProblemDetails = problem });
        return true;
    }
}

public sealed class DatabaseHealthCheck(IServiceScopeFactory scopes) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken ct = default)
    {
        try
        {
            await using var scope = scopes.CreateAsyncScope();
            var connection = scope.ServiceProvider.GetRequiredService<NpgsqlConnection>();
            await connection.OpenAsync(ct);
            return HealthCheckResult.Healthy();
        }
        catch (Exception e)
        {
            return HealthCheckResult.Unhealthy("Database unavailable", e);
        }
    }
}

public static class AdminBootstrap
{
    public static async Task Run(IServiceProvider services, IConfiguration configuration)
    {
        var email = new AccountEmail(configuration["Bootstrap:Email"] ?? throw new InvalidOperationException("Set Bootstrap__Email."));
        var password = configuration["Bootstrap:Password"] ?? throw new InvalidOperationException("Set Bootstrap__Password.");
        await using var scope = services.CreateAsyncScope();
        await scope.ServiceProvider.GetRequiredService<ITransactionRunner>().Run(async () =>
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var roles = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
            // Never promote an existing public account implicitly.
            if (await users.FindByEmailAsync(email.Value)is not null)
                throw new InvalidOperationException("Account already exists; bootstrap only creates a new administrator.");
            if (!await roles.RoleExistsAsync(Roles.Admin))
                Check(await roles.CreateAsync(new IdentityRole<Guid>(Roles.Admin)));
            var user = new ApplicationUser
            {
                Id = Guid.NewGuid(),
                UserName = email.Value,
                Email = email.Value,
                LockoutEnabled = true
            };
            Check(await users.CreateAsync(user, password));
            Check(await users.AddToRoleAsync(user, Roles.Admin));
            return true;
        }, CancellationToken.None);
    }

    private static void Check(IdentityResult result)
    {
        if (!result.Succeeded)
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(x => x.Description)));
    }
}
