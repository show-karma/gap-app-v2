import type { Metadata } from "next";
import { Suspense } from "react";
import { FoundationDetailDynamic } from "@/src/features/non-profits/components/foundation-detail-dynamic";
import { customMetadata } from "@/utilities/meta";
import Loading from "./loading";

/**
 * Foundation detail page (Phase 4).
 * Server Component shell — hydration handled by FoundationDetailDynamic (ssr: false).
 * `params` is a Promise in Next.js 15 App Router.
 *
 * SEO: lightweight cached server fetch for the entity name/description.
 * Falls back to generic metadata if the fetch fails.
 */

interface FoundationPageParams {
  id: string;
}

interface FoundationSeoData {
  name?: string;
  description?: string | null;
}

async function fetchFoundationForSeo(id: string): Promise<FoundationSeoData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_GAP_INDEXER_URL;
  if (!baseUrl) return null;

  try {
    const res = await fetch(`${baseUrl}/v2/philanthropy/foundations/${id}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as FoundationSeoData;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<FoundationPageParams>;
}): Promise<Metadata> {
  const { id } = await params;
  const foundation = await fetchFoundationForSeo(id);

  if (!foundation?.name) {
    return customMetadata({
      title: "Foundation — Karma Find Funders",
      description: "View foundation details, grants, officers, and financials.",
      path: `/nonprofits/find-funders/foundations/${id}`,
    });
  }

  return customMetadata({
    title: `${foundation.name} — Karma Find Funders`,
    description:
      foundation.description ??
      `Explore grants, officers, and financial data for ${foundation.name}.`,
    path: `/nonprofits/find-funders/foundations/${id}`,
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
 * This is allowed here in a way it would not be on a crawlable route: these
 * `[id]` detail routes are not in the sitemap. The section landing and its
 * `/connect` pages are (app/sitemaps/static/sitemap.ts), so DEV-612's ban on a
 * boundary above page content is live one level up -- it just does not reach
 * here.
 */
export default function FoundationPage({ params }: { params: Promise<FoundationPageParams> }) {
  return (
    <Suspense fallback={<Loading />}>
      <FoundationDetailContent params={params} />
    </Suspense>
  );
}

async function FoundationDetailContent({ params }: { params: Promise<FoundationPageParams> }) {
  const { id } = await params;

  return (
    <main className="w-full">
      <FoundationDetailDynamic id={id} />
    </main>
  );
}
