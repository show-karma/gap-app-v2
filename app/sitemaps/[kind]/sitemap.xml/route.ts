import { NextResponse } from "next/server";
import {
  buildUrlsetXml,
  countForKind,
  fetchAllSitemapKindUrls,
  fetchSitemapCounts,
  MAX_URLS_PER_SITEMAP,
  SITEMAP_CACHE_CONTROL,
  SITEMAP_KINDS,
  type SitemapKind,
} from "@/utilities/sitemap";

// Consolidated per-kind child sitemap (/sitemaps/projects/sitemap.xml, …): the
// kind's complete URL list in one file. One file per kind gives Google 7 child
// fetches instead of 29 — every extra file is another fetch it can delay or
// fail — and these URLs replaced the chunked ones in the index, so they carry
// no crawl history. The static and communities siblings are their own routes
// and take precedence over this dynamic segment.
const KIND_META = new Map(SITEMAP_KINDS.map((meta) => [meta.kind, meta]));

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string }> }
): Promise<NextResponse> {
  const { kind } = await params;

  const meta = KIND_META.get(kind as SitemapKind);
  if (!meta) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Past the per-file URL limit the index lists the legacy chunked URLs
  // instead (see buildSitemapIndexBody) — serving 50k+ URLs here would
  // violate the sitemaps.org cap, so this URL stops existing rather than lie.
  // The count is only used for this guard; completeness of the list below
  // comes from the page data itself.
  const counts = await fetchSitemapCounts();
  const total = countForKind(counts, meta.kind);
  if (Number.isFinite(total) && total > MAX_URLS_PER_SITEMAP) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const urls = await fetchAllSitemapKindUrls(meta.kind);

  // The fetcher stops at the per-file URL limit, so hitting it exactly means
  // the list may be truncated (stale counts under-reporting a kind that has
  // outgrown one file). Don't serve a silently incomplete sitemap — once the
  // counts refresh, the index lists the chunked URLs for this kind instead.
  if (urls.length >= MAX_URLS_PER_SITEMAP) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return new NextResponse(buildUrlsetXml(urls, meta.priority, meta.changeFrequency), {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": SITEMAP_CACHE_CONTROL,
    },
  });
}
