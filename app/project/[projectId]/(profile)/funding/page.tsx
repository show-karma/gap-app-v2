"use client";

import dynamic from "next/dynamic";

const FundingContentWrapper = dynamic(
  () =>
    import("@/components/Pages/Project/v2/Content/FundingContentWrapper").then(
      (mod) => mod.FundingContentWrapper
    ),
  {
    loading: () => <div className="animate-pulse text-gray-500">Loading funding...</div>,
  }
);

/**
 * Funding page - displays the list of grants/funding for the project.
 */
export default function FundingPage() {
  return <FundingContentWrapper />;
}
