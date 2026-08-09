import type { Metadata } from "next";
import { Suspense } from "react";
import { BillingPage } from "@/src/features/donor-research/billing/BillingPage";
import { DonorResearchLoading } from "@/src/features/donor-research/components/common/DonorResearchLoading";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Nonprofit Research — Plan and billing",
  description:
    "Manage your nonprofit research plan, see how many reports you have left, and update billing.",
  path: "/nonprofit-research/billing",
  robots: { index: false, follow: false },
});

export default function Page() {
  // `BillingPage` reads the Stripe return params via `useSearchParams`, which
  // opts the subtree into client-side rendering — App Router requires an
  // explicit Suspense boundary for that or the whole route deopts.
  return (
    <Suspense fallback={<DonorResearchLoading label="Loading your plan…" />}>
      <BillingPage />
    </Suspense>
  );
}
