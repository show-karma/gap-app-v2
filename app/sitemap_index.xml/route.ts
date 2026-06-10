import { NextResponse } from "next/server";
import { buildSitemapIndexBody, SITEMAP_CACHE_CONTROL } from "@/utilities/sitemap";

// Never prerender at build time — render on demand only. The indexer fetch is
// still cached via the Data Cache (see fetchSitemapCounts).
export const dynamic = "force-dynamic";

// Fresh-URL copy of /sitemap-index.xml. Google pinned its parsed model of the
// old URL to a degraded 5-child snapshot (May 2026) and successful re-reads
// never refreshed it — its per-URL sitemap state survives content changes.
// Serving the identical index at a URL Google has never seen resets that
// state (John Mueller's documented remedy for stuck sitemap processing).
// The old URLs keep serving so existing references never break; this one is
// what robots.txt advertises and what is submitted in Search Console.
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
