import type { Metadata } from "next";
import { connection } from "next/server";
import { DiligenceResponsePage } from "@/src/features/donor-research/components/diligence-response/DiligenceResponsePage";
import { customMetadata } from "@/utilities/meta";

// The secure email link renders the live token state on every visit: the
// nonprofit sees the current request (and, after they submit, the
// already-submitted state). `dynamic = 'force-dynamic'` keeps the response out
// of edge caches so an expired or already-answered token can't be served stale.

interface PageProps {
  params: Promise<{ token: string }>;
}

export const metadata: Metadata = customMetadata({
  title: "Respond to a research request",
  description: "Answer a few questions to help complete this research request.",
  // Private capability link — never indexed.
  path: "/nonprofit-research/diligence",
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
  return <DiligenceResponsePage token={token} />;
}
