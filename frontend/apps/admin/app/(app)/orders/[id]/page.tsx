import { OrderDetailView } from "../../../../features/orders/orders-view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <OrderDetailView id={(await params).id} />;
}
