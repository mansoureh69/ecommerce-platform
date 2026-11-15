import { PaymentDetailView } from "../../../../features/payments/payments-view";

export default async function Page({ params }: { params: Promise<{ orderId: string }> }) {
  return <PaymentDetailView orderId={(await params).orderId} />;
}
