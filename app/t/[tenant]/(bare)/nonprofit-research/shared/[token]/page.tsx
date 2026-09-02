import type { Metadata } from "next";
import { connection } from "next/server";
import { SharedReportView } from "@/src/features/donor-research/components/shared-view/SharedReportView";
import { customMetadata } from "@/utilities/meta";

// The shared route renders the live token state on every visit (KTD9):
// the donor sees the current state of the report, including any Deep
// enrichment that lands after the link was sent. Next.js's per-route
// `connection()` keeps the response out of edge caches so
// a revoked token cannot be served stale.

interface PageProps {
  params: Promise<{ token: string }>;
}

export const metadata: Metadata = customMetadata({
  title: "Philanthropy Research",
  description: "Research prepared by your philanthropy advisor.",
  // Shared view is intentionally noindex — donor-facing private link.
  path: "/nonprofit-research/shared",
  robots: { index: false, follow: false },
});

// Block class. The token in the URL is the authorization, so this segment must
// never be painted from a prefetched shell — the server has to see the request.
// `instant = false` opts it out of instant navigation. The export is only legal
// with `cacheComponents` enabled (without it the build throws "cannot use
// `export const instant = ...`"), which is why it lands with the flag.
export const instant = false;

export default async function Page({ params }: PageProps) {
  // Runtime-only. Replaces `export const dynamic = "force-dynamic"`, which
  // cacheComponents rejects; the Block-class marker it was waiting for is the
  // `instant = false` export above.
  await connection();

  const { token } = await params;
  return <SharedReportView token={token} />;
}
