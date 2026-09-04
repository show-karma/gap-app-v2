import { connection, type NextResponse } from "next/server";
import { sitemapIndexResponse } from "@/utilities/sitemap";

// Never prerender at build time — render on demand only. The indexer fetch is
// still cached via the Data Cache (see fetchSitemapCounts).
// Headroom for the cold counts fetch so the index itself never 504s.
export const maxDuration = 60;

// Fresh-URL copy of /sitemap-index.xml. Google pinned its parsed model of the
// old URL to a degraded 5-child snapshot (May 2026) and successful re-reads
// never refreshed it — its per-URL sitemap state survives content changes.
// Serving the identical index at a URL Google has never seen resets that
// state (John Mueller's documented remedy for stuck sitemap processing).
// The old URLs keep serving so existing references never break; this one is
// what robots.txt advertises and what is submitted in Search Console.
export async function GET(): Promise<NextResponse> {
  // Runtime-only. Replaces `export const dynamic = "force-dynamic"`, which
  // cacheComponents rejects — and simply dropping that export is NOT
  // equivalent: verified on a production build the route flips to `○`
  // (statically prerendered), baking the response at build time.
  await connection();

  return sitemapIndexResponse();
}
