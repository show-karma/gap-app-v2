import { NextResponse } from "next/server";
import { buildSitemapIndexBody, SITEMAP_CACHE_CONTROL } from "@/utilities/sitemap";

// Never prerender at build time — render on demand only. The indexer fetch is
// still cached via the Data Cache (see fetchSitemapCounts), so this stays cheap.
export const dynamic = "force-dynamic";

// Dynamic sitemap index. The expensive per-kind URL derivation stays in the
// indexer; this route just sizes the index from the indexer's /counts endpoint,
// which is cached in Next's Data Cache with stale-while-revalidate (see
// fetchSitemapCounts). A slow or unreachable indexer therefore serves the last
// good index instead of a degraded one — no build-time generation, no cron.
export async function GET(): Promise<NextResponse> {
  const body = await buildSitemapIndexBody();
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": SITEMAP_CACHE_CONTROL,
    },
  });
}
