import type { Metadata } from "next";
import { Suspense } from "react";
import { PersonaDetailView } from "@/src/features/donor-research/components/personas/PersonaDetailView";
import { customMetadata } from "@/utilities/meta";
import { PAGES } from "@/utilities/pages";
import Loading from "./loading";

interface PageProps {
  params: Promise<{ handleId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handleId } = await params;
  return customMetadata({
    title: "Nonprofit Research — Donor",
    description: "Research profile, private notes, and reports for a donor.",
    path: PAGES.DONOR_RESEARCH.PERSONA(handleId),
    robots: { index: false, follow: false },
  });
}

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
      <PersonaDetailContent params={params} />
    </Suspense>
  );
}

async function PersonaDetailContent({ params }: PageProps) {
  const { handleId } = await params;
  return <PersonaDetailView handleId={handleId} />;
}
