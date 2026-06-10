import { NextResponse } from "next/server";
import { envVars } from "@/utilities/enviromentVars";
import { SITE_URL } from "@/utilities/meta";

// Google's sitemap parser rejects W3C Datetime values with fractional seconds.
// Emit second-precision ISO 8601 instead of the default `.toISOString()`.
export function formatSitemapLastmod(date: Date = new Date()): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

// Must match SITEMAP_PAGE_SIZE in the indexer. GSC fails on >~1MB / 5000 URLs,
// so each child sitemap holds at most this many URLs.
export const SITEMAP_PAGE_SIZE = 1000;

// Upper bound on a chunk number parsed from a request path — ~100M URLs per
// kind at SITEMAP_PAGE_SIZE. Guards the child route against absurd or crafted
// chunk numbers (e.g. /sitemaps/projects/sitemap/99999999999999999.xml) that
// would otherwise trigger a pointless indexer fetch; anything larger 404s.
export const MAX_SITEMAP_CHUNK = 100_000;

// How long Next caches each indexer fetch before a background revalidation.
// Crawler traffic triggers the refresh (stale-while-revalidate), so no cron is
// needed; a slow or unreachable indexer keeps serving the last good response
// instead of an empty one.
export const SITEMAP_REVALIDATE_SECONDS = 60 * 60 * 24; // 24h

// CDN/browser cache window for the rendered XML response.
export const SITEMAP_CACHE_CONTROL = "public, max-age=3600";

export type SitemapKind = "projects" | "impacts" | "grants" | "milestones" | "funding-programs";

export interface SitemapKindMeta {
  kind: SitemapKind;
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly";
}

// The per-kind children listed in the index, in order. `static` and
// `communities` are separate Next sitemap routes (local data) and are added to
// the index directly.
export const SITEMAP_KINDS: readonly SitemapKindMeta[] = [
  { kind: "projects", priority: 0.8, changeFrequency: "daily" },
  { kind: "impacts", priority: 0.7, changeFrequency: "weekly" },
  { kind: "grants", priority: 0.6, changeFrequency: "weekly" },
  { kind: "milestones", priority: 0.5, changeFrequency: "weekly" },
  { kind: "funding-programs", priority: 0.6, changeFrequency: "weekly" },
];

export interface SitemapCounts {
  projects: number;
  impacts: number;
  grants: number;
  milestones: number;
  fundingPrograms: number;
}

// Maps a kind to its field in the indexer's /counts response (note the
// camelCase `fundingPrograms` vs the hyphenated `funding-programs` kind).
const COUNTS_FIELD: Record<SitemapKind, keyof SitemapCounts> = {
  projects: "projects",
  impacts: "impacts",
  grants: "grants",
  milestones: "milestones",
  "funding-programs": "fundingPrograms",
};

export function countForKind(counts: SitemapCounts, kind: SitemapKind): number {
  return counts[COUNTS_FIELD[kind]];
}

// A kind with zero URLs still lists one (empty) chunk so the index entry and the
// child route always agree.
export function chunkCountFromTotal(total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 1;
  return Math.ceil(total / SITEMAP_PAGE_SIZE);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// The indexer builds child URLs from its own configured host, so a deploy wired
// to a staging indexer would emit staging URLs. Rewrite every URL's origin to
// the canonical production host.
export function canonicalizeSitemapUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${SITE_URL}${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return url;
  }
}

// `lastmod` is intentionally omitted. The indexer returns only URL strings (no
// per-entity modified date), so the only value we could emit is "now" on every
// request — which Google treats as an inaccurate freshness signal and, per
// Gary Illyes, makes it distrust/ignore lastmod for the whole site (the signal
// is binary: trustworthy or ignored). Omitting it is strictly better than a
// fabricated date. To reinstate an accurate lastmod, have the indexer return a
// per-URL updatedAt and thread it through `urls` here.
export function buildUrlsetXml(urls: string[], priority: number, changeFrequency: string): string {
  const items = urls
    .map(
      (url) =>
        `  <url>\n    <loc>${escapeXml(canonicalizeSitemapUrl(url))}</loc>\n    <changefreq>${changeFrequency}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>\n`;
}

// See buildUrlsetXml: `lastmod` is omitted here for the same reason (we have no
// accurate per-child-sitemap modified date, only "now").
export function buildSitemapIndexXml(locs: string[]): string {
  const items = locs
    .map((loc) => `  <sitemap>\n    <loc>${escapeXml(loc)}</loc>\n  </sitemap>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>\n`;
}

const INDEXER_BASE_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

// Server-only. Fetches the per-kind URL counts used to size the index. Cached in
// Next's Data Cache with stale-while-revalidate: a failed revalidation keeps the
// last good counts rather than collapsing the index. Throws only on a true cold
// miss (e.g. first request after a deploy) when the indexer is also unreachable.
export async function fetchSitemapCounts(): Promise<SitemapCounts> {
  const res = await fetch(`${INDEXER_BASE_URL}/v2/sitemap/counts`, {
    next: { revalidate: SITEMAP_REVALIDATE_SECONDS },
  });
  if (!res.ok) {
    throw new Error(`sitemap counts fetch failed: HTTP ${res.status}`);
  }
  return (await res.json()) as SitemapCounts;
}

// Server-only. Fetches one chunk's worth of URLs for a kind, cached the same way
// as the counts. Returns the canonicalized URLs.
export async function fetchSitemapKindPage(kind: SitemapKind, page: number): Promise<string[]> {
  const res = await fetch(
    `${INDEXER_BASE_URL}/v2/sitemap?kind=${kind}&page=${page}&pageSize=${SITEMAP_PAGE_SIZE}`,
    { next: { revalidate: SITEMAP_REVALIDATE_SECONDS } }
  );
  if (!res.ok) {
    throw new Error(`sitemap ${kind}/${page} fetch failed: HTTP ${res.status}`);
  }
  const data = (await res.json()) as { urls?: string[] };
  return (data.urls ?? []).map(canonicalizeSitemapUrl);
}

// Server-only. Builds the sitemap index body: the two local-data children
// (static, communities) plus the per-kind chunks sized from the live counts.
// The chunk count is derived fresh on every (cached) refresh, so the index
// grows automatically as the corpus grows — no committed floor to maintain.
export async function buildSitemapIndexBody(): Promise<string> {
  const counts = await fetchSitemapCounts();

  const locs: string[] = [
    `${SITE_URL}/sitemaps/static/sitemap.xml`,
    `${SITE_URL}/sitemaps/communities/sitemap.xml`,
  ];

  for (const { kind } of SITEMAP_KINDS) {
    const chunks = chunkCountFromTotal(countForKind(counts, kind));
    for (let page = 1; page <= chunks; page++) {
      locs.push(`${SITE_URL}/sitemaps/${kind}/sitemap/${page}.xml`);
    }
  }

  return buildSitemapIndexXml(locs);
}

// Shared GET body for the three index routes (/sitemap.xml, /sitemap-index.xml,
// /sitemap_index.xml) so the response headers can't drift between them. Each
// route file still declares its own `dynamic = "force-dynamic"` — Next reads
// that from the route module itself, so it can't live here.
export async function sitemapIndexResponse(): Promise<NextResponse> {
  const body = await buildSitemapIndexBody();
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": SITEMAP_CACHE_CONTROL,
    },
  });
}
