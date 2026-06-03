import { NextResponse } from "next/server";
import {
  buildUrlsetXml,
  fetchSitemapKindPage,
  SITEMAP_CACHE_CONTROL,
  SITEMAP_KINDS,
  type SitemapKind,
} from "@/utilities/sitemap";

// Per-kind child sitemap chunk. Fetches the chunk's URLs from the indexer,
// cached in Next's Data Cache with stale-while-revalidate (see
// fetchSitemapKindPage), so a slow or unreachable indexer keeps serving the
// last good chunk instead of an empty one. The index only lists chunks that
// exist (sized from /counts), so a listed chunk normally has URLs; a chunk
// fetched past the current end returns an empty-but-valid 200 urlset.
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
  const urls = await fetchSitemapKindPage(meta.kind, page);

  return new NextResponse(buildUrlsetXml(urls, meta.priority, meta.changeFrequency), {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": SITEMAP_CACHE_CONTROL,
    },
  });
}
