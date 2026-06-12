import type { NextResponse } from "next/server";
import { sitemapIndexResponse } from "@/utilities/sitemap";

// Never prerender at build time — render on demand only. The indexer fetch is
// still cached via the Data Cache (see fetchSitemapCounts).
export const dynamic = "force-dynamic";

// Legacy index URL. Google's stored state for it is stuck on a degraded May
// 2026 parse, so robots.txt now advertises /sitemap_index.xml instead (see
// that route for the full story). Kept serving so existing submissions and
// external references never break.
export async function GET(): Promise<NextResponse> {
  return sitemapIndexResponse();
}
