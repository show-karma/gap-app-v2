import type { Metadata } from "next";
import { Suspense } from "react";
import { NewReportView } from "@/src/features/donor-research/components/common/NewReportView";
import { customMetadata } from "@/utilities/meta";

interface PageProps {
  searchParams: Promise<{ handle?: string }>;
}

export const metadata: Metadata = customMetadata({
  title: "Nonprofit Research — New Report",
  description: "Start a new ranked nonprofit research report for a donor.",
  path: "/nonprofit-research/new",
  robots: { index: false, follow: false },
});

/**
 * Awaits the query string. Kept in its own component so the `searchParams`
 * promise is resolved *below* the boundary: awaiting it in the page body makes
 * the whole route dynamic, while resolving it here lets the shell prerender and
 * the view stream in once the query is known.
 */
async function NewReportViewWithHandle({ searchParams }: PageProps) {
  const { handle } = await searchParams;

  return <NewReportView initialDonorHandleId={handle} />;
}

// noindex (see metadata above), so a boundary here hides nothing from a crawler
// and DEV-612 does not apply.
export default function Page({ searchParams }: PageProps) {
  return (
    <Suspense fallback={null}>
      <NewReportViewWithHandle searchParams={searchParams} />
    </Suspense>
  );
}
