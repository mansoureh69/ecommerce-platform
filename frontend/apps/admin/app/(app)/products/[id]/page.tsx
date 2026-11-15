import { ProductDetailView } from "../../../../features/products/product-detail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ProductDetailView id={(await params).id} />;
}
