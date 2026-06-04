import { NextResponse } from "next/server";
import { buildSitemapIndexBody, SITEMAP_CACHE_CONTROL } from "@/utilities/sitemap";

// `/sitemap.xml` is a reserved Next metadata path, so without this it gets
// statically prerendered at build time — which calls the indexer during the
// build (reintroducing build coupling) and bakes a failed response if the
// indexer is down. Force dynamic so the route is only ever rendered on demand;
// the indexer fetch is still cached via the Data Cache (see fetchSitemapCounts).
export const dynamic = "force-dynamic";

// Alias of /sitemap-index.xml. Both are advertised in robots.txt; GSC treats
// the two URLs as independent submissions, so we keep serving both with
// identical content.
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
