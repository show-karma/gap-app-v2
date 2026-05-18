import { SITE_URL } from "@/utilities/meta";
import type { SitemapKind } from "@/utilities/sitemap";
import { computeChunkCount, fetchSitemapCounts, SITEMAP_PAGE_SIZE } from "@/utilities/sitemap";

export const revalidate = 3600;
// Cold starts can push the upstream counts fetch close to Vercel's default 10s
// limit. Allow more headroom so a slow indexer round-trip never produces a
// 504 — Googlebot interprets that as "Couldn't fetch".
export const maxDuration = 30;

const COUNTS_TIMEOUT_MS = 4000;

interface SitemapEntry {
  loc: string;
  lastmod: string;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function formatLastmod(date: Date): string {
  // W3C Datetime without fractional seconds — Google's sitemap parser is
  // strict here and has been observed to reject the default ISO 8601 form
  // with milliseconds (e.g. "2026-05-18T16:08:48.340Z").
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function buildSitemapIndex(entries: SitemapEntry[]): string {
  const now = formatLastmod(new Date());
  const items = entries
    .map(
      (e) =>
        `  <sitemap>\n    <loc>${e.loc}</loc>\n    <lastmod>${e.lastmod ?? now}</lastmod>\n  </sitemap>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>`;
}

export async function GET(): Promise<Response> {
  const now = formatLastmod(new Date());
  const entries: SitemapEntry[] = [];

  // Static pages sitemap
  entries.push({ loc: `${SITE_URL}/sitemaps/static/sitemap.xml`, lastmod: now });

  // Communities sitemap (single file, not chunked)
  entries.push({ loc: `${SITE_URL}/sitemaps/communities/sitemap.xml`, lastmod: now });

  // Chunked sitemaps — fetch counts to know how many chunks per kind. Bound
  // the call so a slow indexer cannot stall the response past Googlebot's
  // patience. On timeout, fall back to null and chunk counts default to 0
  // (static + communities entries still render).
  const counts = await withTimeout(fetchSitemapCounts(), COUNTS_TIMEOUT_MS, null);

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
      // Match the headers Next.js emits for the child sitemaps under
      // app/sitemaps/*/sitemap.ts. The previous "application/xml; charset=utf-8"
      // caused GSC to classify this file as Type=Unknown and report
      // "Couldn't fetch" even though the XML validated against siteindex.xsd.
      "Content-Type": "application/xml",
      "Content-Disposition": "inline",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
