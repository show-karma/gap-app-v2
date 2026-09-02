import type { Metadata } from "next";
import { Suspense } from "react";
import { ReportBriefView } from "@/src/features/donor-research/components/report-brief/ReportBriefView";
import { customMetadata } from "@/utilities/meta";
import Loading from "./loading";

interface PageProps {
  params: Promise<{ reportId: string }>;
}

export const metadata: Metadata = customMetadata({
  title: "Nonprofit Research — Report",
  description: "View a nonprofit-research report.",
  path: "/nonprofit-research",
  robots: { index: false, follow: false },
});

/**
 * The `params` read lives in the async child below, not in the page body.
 *
 * Under `cacheComponents` a `params` access in the page itself is runtime data
 * outside a boundary, and the route fails to prerender outright (P2-6). One
 * level down it sits behind this Suspense boundary: the shell prerenders and
 * only the id-dependent part streams. The fallback is the route's own
 * `loading.tsx`, so the streamed state is what this route already showed while
 * it was fully dynamic.
 *
 * The donor-research workspace is auth-gated and noindex, so DEV-612's ban on a
 * boundary above page content does not apply.
 */
export default function Page({ params }: PageProps) {
  return (
    <Suspense fallback={<Loading />}>
      <ReportBriefContent params={params} />
    </Suspense>
  );
}

async function ReportBriefContent({ params }: PageProps) {
  const { reportId } = await params;
  return <ReportBriefView reportId={reportId} />;
}
