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

export default async function Page({ params }: PageProps) {
  // Runtime-only. Replaces `export const dynamic = "force-dynamic"`, which
  // cacheComponents rejects. `export const instant = false` is the eventual
  // Block-class marker, but it is a hard build error until cacheComponents
  // is on, so it lands with the flag in P2-6.
  await connection();

  const { token } = await params;
  return <SharedReportView token={token} />;
}
