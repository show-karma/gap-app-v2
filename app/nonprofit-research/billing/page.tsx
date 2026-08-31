import type { Metadata } from "next";
import { BillingPage } from "@/src/features/donor-research/billing/BillingPage";
import { customMetadata } from "@/utilities/meta";

interface PageProps {
  /** `?checkout=success|cancel`, set by Stripe on the return trip. */
  searchParams: Promise<{ checkout?: string }>;
}

export const metadata: Metadata = customMetadata({
  title: "Nonprofit Research — Plan and billing",
  description:
    "Manage your nonprofit research plan, see how many reports you have left, and update billing.",
  path: "/nonprofit-research/billing",
  robots: { index: false, follow: false },
});

export default async function Page({ searchParams }: PageProps) {
  // Read server-side rather than with `useSearchParams` in the client
  // component: that hook opts the whole route into client-side rendering and
  // needs its own Suspense boundary. `loading.tsx` covers this route already.
  const { checkout } = await searchParams;
  return <BillingPage checkoutParam={checkout ?? null} />;
}
