using System.Data;
using EcommercePlatform.BuildingBlocks.Application;
using EcommercePlatform.BuildingBlocks.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace EcommercePlatform.BuildingBlocks.Infrastructure;
public sealed class TransactionEffects(ILogger<TransactionEffects> logger) : ITransactionEffects
{
    private readonly List<Func<CancellationToken, Task>> rollback = [];
    public void OnRollback(Func<CancellationToken, Task> action) => rollback.Add(action);
    internal async Task Rollback(CancellationToken ct)
    {
        foreach (var action in rollback.AsEnumerable().Reverse())
        {
            try
            {
                await action(ct);
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "A transaction rollback compensation failed.");
            }
        }

        rollback.Clear();
    }

    internal void Clear() => rollback.Clear();
}

public interface IModuleSession
{
    DbContext Context { get; }
}

public abstract class ModuleDbContext(DbContextOptions options) : DbContext(options), IModuleSession
{
    public DbContext Context => this;

    protected override void OnModelCreating(ModelBuilder model)
    {
        // IDs are assigned by the domain. EF must treat new children of tracked
        // aggregates as inserts rather than updates with pre-generated keys.
        foreach (var entity in model.Model.GetEntityTypes().Where(e => typeof(Entity).IsAssignableFrom(e.ClrType)))
            model.Entity(entity.ClrType).Property(nameof(Entity.Id)).ValueGeneratedNever();
        foreach (var entity in model.Model.GetEntityTypes().Where(e => typeof(AggregateRoot).IsAssignableFrom(e.ClrType)))
        {
            var b = model.Entity(entity.ClrType);
            b.Ignore(nameof(AggregateRoot.DomainEvents));
            b.Property<Guid>("Revision").IsConcurrencyToken();
            b.Property<DateTimeOffset>("CreatedAtUtc");
            b.Property<DateTimeOffset>("UpdatedAtUtc");
        }
    }

    public override Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        foreach (var entry in ChangeTracker.Entries<AggregateRoot>().Where(e => e.State is EntityState.Added or EntityState.Modified))
        {
            entry.Property("Revision").CurrentValue = Guid.NewGuid();
            entry.Property("UpdatedAtUtc").CurrentValue = DateTimeOffset.UtcNow;
            if (entry.State == EntityState.Added)
                entry.Property("CreatedAtUtc").CurrentValue = DateTimeOffset.UtcNow;
        }

        return base.SaveChangesAsync(ct);
    }

    protected override void ConfigureConventions(ModelConfigurationBuilder configuration)
    {
        configuration.Properties<decimal>().HavePrecision(19, 3);
        configuration.Properties<string>().HaveMaxLength(2000);
    }
}

public sealed class TransactionRunner(NpgsqlConnection connection, IEnumerable<IModuleSession> sessions, IPublisher publisher, TransactionEffects effects) : ITransactionRunner
{
    private bool active;
    public async Task<T> Run<T>(Func<Task<T>> action, CancellationToken ct)
    {
        if (active)
            return await action();
        if (connection.State != ConnectionState.Open)
            await connection.OpenAsync(ct);
        await using var transaction = await connection.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var contexts = sessions.Select(s => s.Context).ToArray();
        active = true;
        try
        {
            foreach (var context in contexts)
                await context.Database.UseTransactionAsync(transaction, ct);
            var response = await action();
            // Handlers are local and transactional. External I/O is forbidden in domain handlers.
            var dispatched = new HashSet<Guid>();
            while (true)
            {
                var events = contexts.SelectMany(c => c.ChangeTracker.Entries<AggregateRoot>()).SelectMany(e => e.Entity.DomainEvents).Where(e => !dispatched.Contains(e.EventId)).ToArray();
                if (events.Length == 0)
                    break;
                foreach (var e in events)
                {
                    if (dispatched.Count >= 1000)
                        throw new InvalidOperationException("Domain event cycle detected.");
                    dispatched.Add(e.EventId);
                    var notification = Activator.CreateInstance(typeof(DomainNotification<>).MakeGenericType(e.GetType()), e)!;
                    await publisher.Publish(notification, ct);
                }
            }

            foreach (var context in contexts)
                await context.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            effects.Clear();
            foreach (var aggregate in contexts.SelectMany(c => c.ChangeTracker.Entries<AggregateRoot>()))
                aggregate.Entity.ClearDomainEvents();
            return response;
        }
        catch
        {
            await transaction.RollbackAsync(CancellationToken.None);
            foreach (var context in contexts)
                context.ChangeTracker.Clear();
            await effects.Rollback(CancellationToken.None);
            throw;
        }
        finally
        {
            foreach (var context in contexts)
                await context.Database.UseTransactionAsync(null, CancellationToken.None);
            active = false;
        }
    }
}

public static class PersistenceRegistration
{
    public static IServiceCollection AddModuleContext<T>(this IServiceCollection services, string schema)
        where T : DbContext, IModuleSession
    {
        services.AddDbContext<T>((sp, options) => options.UseNpgsql(sp.GetRequiredService<NpgsqlConnection>(), npgsql => npgsql.MigrationsHistoryTable("__EFMigrationsHistory", schema)));
        services.AddScoped<IModuleSession>(sp => sp.GetRequiredService<T>());
        return services;
    }
}
