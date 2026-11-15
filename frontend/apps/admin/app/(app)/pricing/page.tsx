import { Suspense } from "react";
import { PricingView } from "../../../features/pricing/pricing-view";

export default function Page() {
  return (
    <Suspense fallback={<p aria-busy="true">Loading…</p>}>
      <PricingView />
    </Suspense>
  );
}
