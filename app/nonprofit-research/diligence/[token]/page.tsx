import type { Metadata } from "next";
import { DiligenceResponsePage } from "@/src/features/donor-research/components/diligence-response/DiligenceResponsePage";
import { customMetadata } from "@/utilities/meta";

// The secure email link renders the live token state on every visit: the
// nonprofit sees the current request (and, after they submit, the
// already-submitted state). `dynamic = 'force-dynamic'` keeps the response out
// of edge caches so an expired or already-answered token can't be served stale.
export const dynamic = "force-dynamic";

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

export default async function Page({ params }: PageProps) {
  const { token } = await params;
  return <DiligenceResponsePage token={token} />;
}
