"use client";

import dynamic from "next/dynamic";
import { FundingContentSkeleton } from "@/components/Pages/Project/v2/Skeletons";

const FundingContentWrapper = dynamic(
  () =>
    import("@/components/Pages/Project/v2/Content/FundingContentWrapper").then(
      (mod) => mod.FundingContentWrapper
    ),
  {
    loading: () => <FundingContentSkeleton />,
  }
);

/**
 * Client-side funding content wrapper.
 */
export function FundingPageClient() {
  return <FundingContentWrapper />;
}
