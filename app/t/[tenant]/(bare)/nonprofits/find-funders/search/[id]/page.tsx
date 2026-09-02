import type { Metadata } from "next";
import { Suspense } from "react";
import { ChatViewDynamic } from "@/src/features/non-profits/components/chat-view-dynamic";
import { SearchRail } from "@/src/features/non-profits/components/search-rail";
import { customMetadata } from "@/utilities/meta";
import Loading from "./loading";

interface SearchPageParams {
  id: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<SearchPageParams>;
}): Promise<Metadata> {
  const { id } = await params;
  return customMetadata({
    title: "Search — Karma Find Funders",
    description:
      "AI-powered philanthropic prospecting. Find funders, explore foundations, and research grants in plain English.",
    path: `/nonprofits/find-funders/search/${id}`,
  });
}

/**
 * Search workbench page (Phase 3).
 * Server Component shell — hydration is handled by ChatViewDynamic (ssr: false).
 */
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
export default function SearchResultsPage({ params }: { params: Promise<SearchPageParams> }) {
  return (
    <Suspense fallback={<Loading />}>
      <SearchResultsContent params={params} />
    </Suspense>
  );
}

async function SearchResultsContent({ params }: { params: Promise<SearchPageParams> }) {
  const { id } = await params;

  return (
    <main className="flex w-full">
      <div className="min-w-0 flex-1">
        <ChatViewDynamic searchId={id} />
      </div>
      <SearchRail />
    </main>
  );
}
