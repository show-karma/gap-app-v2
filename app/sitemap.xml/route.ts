import { SITE_URL } from "@/utilities/meta";
import type { SitemapKind } from "@/utilities/sitemap";
import { computeChunkCount, fetchSitemapCounts, SITEMAP_PAGE_SIZE } from "@/utilities/sitemap";

export const revalidate = 3600;

interface SitemapEntry {
  loc: string;
  lastmod: string;
}

function buildSitemapIndex(entries: SitemapEntry[]): string {
  const now = new Date().toISOString();
  const items = entries
    .map(
      (e) =>
        `  <sitemap>\n    <loc>${e.loc}</loc>\n    <lastmod>${e.lastmod ?? now}</lastmod>\n  </sitemap>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>`;
}

export async function GET(): Promise<Response> {
  const now = new Date().toISOString();
  const entries: SitemapEntry[] = [];

  // Static pages sitemap
  entries.push({ loc: `${SITE_URL}/sitemaps/static/sitemap.xml`, lastmod: now });

  // Communities sitemap (single file, not chunked)
  entries.push({ loc: `${SITE_URL}/sitemaps/communities/sitemap.xml`, lastmod: now });

  // Chunked sitemaps — fetch counts to know how many chunks per kind
  const counts = await fetchSitemapCounts();

  const kindConfig: Array<{
    kind: SitemapKind;
    total: number;
    path: string;
  }> = [
    {
      kind: "projects",
      total: counts?.projects ?? 0,
      path: "projects",
    },
    {
      kind: "impacts",
      total: counts?.impacts ?? 0,
      path: "impacts",
    },
    {
      kind: "grants",
      total: counts?.grants ?? 0,
      path: "grants",
    },
    {
      kind: "milestones",
      total: counts?.milestones ?? 0,
      path: "milestones",
    },
    {
      kind: "funding-programs",
      total: counts?.fundingPrograms ?? 0,
      path: "funding-programs",
    },
  ];

  for (const { total, path } of kindConfig) {
    const chunkCount = computeChunkCount(total, SITEMAP_PAGE_SIZE);
    for (let i = 1; i <= chunkCount; i++) {
      entries.push({
        loc: `${SITE_URL}/sitemaps/${path}/sitemap/${i}.xml`,
        lastmod: now,
      });
    }
  }

  const xml = buildSitemapIndex(entries);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
