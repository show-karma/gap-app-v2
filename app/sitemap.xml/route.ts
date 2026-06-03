import { NextResponse } from "next/server";
import { buildSitemapIndexBody, SITEMAP_CACHE_CONTROL } from "@/utilities/sitemap";

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
