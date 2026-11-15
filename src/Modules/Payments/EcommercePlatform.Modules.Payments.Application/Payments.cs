using EcommercePlatform.BuildingBlocks.Application;
using EcommercePlatform.BuildingBlocks.Domain;
using EcommercePlatform.Modules.Payments.Domain;
using EcommercePlatform.Modules.Orders.Application;
using FluentValidation;
using MediatR;

namespace EcommercePlatform.Modules.Payments.Application;
public interface IPaymentStore
{
    Task<Payment?> Find(Guid orderId, CancellationToken ct);
    void Add(Payment payment);
    Task<Page<AdminPaymentDto>> List(int page, int size, CancellationToken ct);
}

public sealed record RecordSettlement(Guid OrderId, decimal Amount, string Currency, string Reference) : ICommand<PaymentDto>;
public sealed record RecordRefund(Guid OrderId, string Reference) : ICommand<PaymentDto>;
public sealed record GetPayment(Guid OrderId) : IRequest<PaymentDto>;
public sealed record AdminListPayments(int Page = 1, int Size = 20) : IRequest<Page<AdminPaymentDto>>;
public sealed record AdminGetPayment(Guid OrderId) : IRequest<AdminPaymentDto>;
public sealed record AdminPaymentDto(Guid Id, Guid OrderId, Money Amount, string Reference, Guid RecordedBy, DateTimeOffset SettledAt, string? RefundReference, Guid? RefundedBy, DateTimeOffset? RefundedAt)
{
    public static AdminPaymentDto From(Payment p) => new(p.Id, p.OrderId, p.Amount, p.SettlementReference, p.RecordedBy, p.SettledAt, p.RefundReference, p.RefundedBy, p.RefundedAt);
}

public sealed class AdminListPaymentsValidator : AbstractValidator<AdminListPayments>
{
    public AdminListPaymentsValidator()
    {
        RuleFor(x => x.Page).InclusiveBetween(1, 100000);
        RuleFor(x => x.Size).InclusiveBetween(1, 100);
    }
}

public sealed class AdminPaymentHandlers(IPaymentStore store) : IRequestHandler<AdminListPayments, Page<AdminPaymentDto>>, IRequestHandler<AdminGetPayment, AdminPaymentDto>
{
    public Task<Page<AdminPaymentDto>> Handle(AdminListPayments r, CancellationToken ct) => store.List(r.Page, r.Size, ct);
    public async Task<AdminPaymentDto> Handle(AdminGetPayment r, CancellationToken ct) => AdminPaymentDto.From(await store.Find(r.OrderId, ct) ?? throw new KeyNotFoundException());
}

public sealed record PaymentDto(Guid Id, Guid OrderId, Money Amount, string Reference, string? RefundReference);
public sealed class PaymentHandlers(IPaymentStore store, IOrders orders, ICurrentUser user) : IRequestHandler<RecordSettlement, PaymentDto>, IRequestHandler<RecordRefund, PaymentDto>, IRequestHandler<GetPayment, PaymentDto>
{
    private static PaymentDto Dto(Payment p) => new(p.Id, p.OrderId, p.Amount, p.SettlementReference, p.RefundReference);
    public async Task<PaymentDto> Handle(RecordSettlement r, CancellationToken ct)
    {
        var amount = new Money(r.Amount, r.Currency);
        var reference = Guard.Text(r.Reference, 200, nameof(r.Reference));
        var existing = await store.Find(r.OrderId, ct);
        if (existing is not null)
        {
            if (existing.Amount != amount || existing.SettlementReference != reference)
                throw new ConflictException("Settlement conflicts with the recorded payment.");
            return Dto(existing);
        }

        await orders.MarkPaid(r.OrderId, amount, ct);
        var payment = new Payment(r.OrderId, amount, reference, user.RequireId());
        store.Add(payment);
        return Dto(payment);
    }

    public async Task<PaymentDto> Handle(RecordRefund r, CancellationToken ct)
    {
        var payment = await store.Find(r.OrderId, ct) ?? throw new KeyNotFoundException();
        var wasRefunded = payment.RefundReference is not null;
        payment.Refund(r.Reference, user.RequireId());
        if (!wasRefunded)
            await orders.Refund(r.OrderId, ct);
        return Dto(payment);
    }

    public async Task<PaymentDto> Handle(GetPayment r, CancellationToken ct)
    {
        var order = await orders.ReadForSettlement(r.OrderId, ct);
        if (order.CustomerId != user.RequireId())
            throw new KeyNotFoundException();
        return Dto(await store.Find(r.OrderId, ct) ?? throw new KeyNotFoundException());
    }
}
