import type { Metadata } from "next";
import { Suspense } from "react";
import { NonprofitDetailDynamic } from "@/src/features/non-profits/components/nonprofit-detail-dynamic";
import { customMetadata } from "@/utilities/meta";
import Loading from "./loading";

/**
 * Nonprofit detail page (Phase 4).
 * Server Component shell — hydration handled by NonprofitDetailDynamic (ssr: false).
 */

interface NonprofitPageParams {
  id: string;
}

interface NonprofitSeoData {
  name?: string;
  description?: string | null;
}

async function fetchNonprofitForSeo(id: string): Promise<NonprofitSeoData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_GAP_INDEXER_URL;
  if (!baseUrl) return null;

  try {
    const res = await fetch(`${baseUrl}/v2/philanthropy/nonprofits/${id}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as NonprofitSeoData;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<NonprofitPageParams>;
}): Promise<Metadata> {
  const { id } = await params;
  const nonprofit = await fetchNonprofitForSeo(id);

  if (!nonprofit?.name) {
    return customMetadata({
      title: "Nonprofit — Karma Find Funders",
      description: "View nonprofit details and grants received.",
      path: `/nonprofits/find-funders/nonprofits/${id}`,
    });
  }

  return customMetadata({
    title: `${nonprofit.name} — Karma Find Funders`,
    description:
      nonprofit.description ??
      `Explore grants received by ${nonprofit.name} and their funding sources.`,
    path: `/nonprofits/find-funders/nonprofits/${id}`,
  });
}

/**
 * The `params` read lives in the async child below, not in the page body.
 *
 * Under `cacheComponents` a `params` access in the page itself is runtime data
 * outside a boundary, and the route fails to prerender outright (P2-6). One
 * level down it sits behind this Suspense boundary: the shell prerenders and
 * only the id-dependent part streams. The fallback is the route's own
 * `loading.tsx`, so the streamed state is byte-for-byte what this route already
 * showed while it was fully dynamic.
 *
 * This is allowed here in a way it would not be on a crawlable route: nothing
 * under find-funders is in the sitemap, so DEV-612's ban on a boundary above
 * page content does not apply.
 */
export default function NonprofitPage({ params }: { params: Promise<NonprofitPageParams> }) {
  return (
    <Suspense fallback={<Loading />}>
      <NonprofitDetailContent params={params} />
    </Suspense>
  );
}

async function NonprofitDetailContent({ params }: { params: Promise<NonprofitPageParams> }) {
  const { id } = await params;

  return (
    <main className="w-full">
      <NonprofitDetailDynamic id={id} />
    </main>
  );
}
