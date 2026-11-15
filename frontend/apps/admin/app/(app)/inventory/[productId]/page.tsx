import { StockDetailView } from "../../../../features/inventory/inventory-view";

export default async function Page({ params }: { params: Promise<{ productId: string }> }) {
  return <StockDetailView productId={(await params).productId} />;
}
