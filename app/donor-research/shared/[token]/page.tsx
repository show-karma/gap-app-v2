import type { Metadata } from "next";
import { SharedReportView } from "@/src/features/donor-research/components/shared-view/SharedReportView";
import { customMetadata } from "@/utilities/meta";

// The shared route renders the live token state on every visit (KTD9):
// the donor sees the current state of the report, including any Deep
// enrichment that lands after the link was sent. Next.js's per-route
// `dynamic = 'force-dynamic'` keeps the response out of edge caches so
// a revoked token cannot be served stale.
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ token: string }>;
}

export const metadata: Metadata = customMetadata({
  title: "Philanthropy Research",
  description: "Research prepared by your philanthropy advisor.",
  // Shared view is intentionally noindex — donor-facing private link.
  path: "/donor-research/shared",
  robots: { index: false, follow: false },
});

export default async function Page({ params }: PageProps) {
  const { token } = await params;
  return <SharedReportView token={token} />;
}
