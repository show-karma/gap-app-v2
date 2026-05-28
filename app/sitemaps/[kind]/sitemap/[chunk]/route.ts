import { NextResponse } from "next/server";

// Child sitemap chunks for these kinds are pre-generated as static files under
// `public/sitemaps/{kind}/sitemap/{n}.xml` at build time (see
// `scripts/generate-sitemap.ts`). Next.js serves an existing `public/` file in
// preference to this dynamic route, so this handler only ever runs for a chunk
// that has NO static file — i.e. a chunk Google recorded from a previous build
// but that the current index no longer lists.
//
// For those orphaned chunks we return an empty-but-valid urlset with HTTP 200
// instead of a 404. Google Search Console treats a 404 on a previously-fetched
// child sitemap as a "Couldn't fetch" error that lingers in the index
// drilldown; an empty 200 is read as "0 URLs" and the chunk is dropped cleanly.
const KIND_PATHS = new Set(["projects", "impacts", "grants", "milestones", "funding-programs"]);

const CHUNK_FILENAME = /^\d+\.xml$/;

const EMPTY_URLSET = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>
`;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string; chunk: string }> }
): Promise<NextResponse> {
  const { kind, chunk } = await params;

  if (!KIND_PATHS.has(kind) || !CHUNK_FILENAME.test(chunk)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return new NextResponse(EMPTY_URLSET, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
