import { ProductFormView } from "../../../../features/products/product-form";

export default function Page() {
  return (
    <>
      <header className="page-header"><h1>New product</h1></header>
      <ProductFormView />
    </>
  );
}
