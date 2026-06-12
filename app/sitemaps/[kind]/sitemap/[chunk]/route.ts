import { NextResponse } from "next/server";
import {
  buildUrlsetXml,
  fetchSitemapKindPage,
  MAX_SITEMAP_CHUNK,
  SITEMAP_CACHE_CONTROL,
  SITEMAP_KINDS,
  type SitemapKind,
} from "@/utilities/sitemap";

// LEGACY per-kind child sitemap chunk (1,000 URLs per file). The index now
// lists one consolidated file per kind (/sitemaps/<kind>/sitemap.xml) and only
// falls back to these chunked URLs for a kind past the per-file URL limit.
// Kept serving because the chunk URLs were submitted individually in GSC and
// Google still re-crawls them; same Data Cache + SWR semantics as the
// consolidated route.
const KIND_META = new Map(SITEMAP_KINDS.map((meta) => [meta.kind, meta]));

// Positive chunk filenames only — 1.xml, 2.xml, … never 0.xml or zero-padded.
const CHUNK_FILENAME = /^[1-9]\d*\.xml$/;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string; chunk: string }> }
): Promise<NextResponse> {
  const { kind, chunk } = await params;

  const meta = KIND_META.get(kind as SitemapKind);
  if (!meta || !CHUNK_FILENAME.test(chunk)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const page = Number.parseInt(chunk, 10);
  if (!Number.isSafeInteger(page) || page > MAX_SITEMAP_CHUNK) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const urls = await fetchSitemapKindPage(meta.kind, page);

  return new NextResponse(buildUrlsetXml(urls, meta.priority, meta.changeFrequency), {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": SITEMAP_CACHE_CONTROL,
    },
  });
}
