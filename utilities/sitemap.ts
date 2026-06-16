import { NextResponse } from "next/server";
import { envVars } from "@/utilities/enviromentVars";
import { SITE_URL } from "@/utilities/meta";

// Google's sitemap parser rejects W3C Datetime values with fractional seconds.
// Emit second-precision ISO 8601 instead of the default `.toISOString()`.
export function formatSitemapLastmod(date: Date = new Date()): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

// Page size of the LEGACY chunked child routes (/sitemaps/<kind>/sitemap/<n>.xml).
// Those URLs were submitted to GSC individually and must keep serving the same
// chunk boundaries; new crawling goes through the consolidated per-kind files.
export const SITEMAP_PAGE_SIZE = 1000;

// Page size used when fetching URL lists from the indexer — its hard cap
// (limitQuerySchema max in gap-indexer's GetSitemapUrlsQuerySchema). Bigger
// pages mean fewer indexer round-trips: a full cold rebuild of every kind is
// ~9 requests, comfortably under the indexer's 30 req/min public rate limit
// (which a 1000-per-page rebuild of 29 chunks sat exactly at).
export const INDEXER_FETCH_PAGE_SIZE = 5000;

// One consolidated sitemap per kind, capped with margin under the sitemaps.org
// limit of 50,000 URLs per file. A kind that outgrows this falls back to the
// legacy chunked URLs in the index; everything still serves.
export const MAX_URLS_PER_SITEMAP = 45_000;

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

// Crawlers get an instant edge hit for a day, then Vercel's CDN serves the
// stale copy for up to a week while it revalidates in the background — a slow
// function or indexer never makes Googlebot wait or time out. max-age=0 keeps
// browsers honest (the CDN, not the client, owns staleness). The CDN layer is
// opportunistic only (purged on deploy, evicts rarely-hit assets); the
// deploy-persistent Data Cache underneath is what guarantees fast renders.
export const SITEMAP_CACHE_CONTROL =
  "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800";

export type SitemapKind = "projects" | "impacts" | "grants" | "milestones" | "funding-programs";

export interface SitemapKindMeta {
  kind: SitemapKind;
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly";
}

// Every kind whose per-kind route still serves. `static` and `communities` are
// separate Next sitemap routes (local data) and are added to the index
// directly. The impacts/grants/milestones routes keep returning 200 because
// Google already holds those child-sitemap URLs from past submissions — we must
// not start 404ing them — but they are no longer advertised by the index (see
// INDEXED_SITEMAP_KINDS).
export const SITEMAP_KINDS: readonly SitemapKindMeta[] = [
  { kind: "projects", priority: 0.8, changeFrequency: "daily" },
  { kind: "impacts", priority: 0.7, changeFrequency: "weekly" },
  { kind: "grants", priority: 0.6, changeFrequency: "weekly" },
  { kind: "milestones", priority: 0.5, changeFrequency: "weekly" },
  { kind: "funding-programs", priority: 0.6, changeFrequency: "weekly" },
];

// The subset the sitemap index actually advertises: only the high-value,
// canonical kinds. The thin tab variants (impacts/grants/milestones) are
// near-duplicates of the project root, are now noindexed, and would dilute
// crawl budget if listed — so they are dropped from the index. Their per-kind
// routes still serve (see SITEMAP_KINDS) so already-submitted URLs stay 200.
export const INDEXED_SITEMAP_KINDS: readonly SitemapKindMeta[] = SITEMAP_KINDS.filter(
  (meta) => meta.kind === "projects" || meta.kind === "funding-programs"
);

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
export async function fetchSitemapKindPage(
  kind: SitemapKind,
  page: number,
  pageSize: number = SITEMAP_PAGE_SIZE
): Promise<string[]> {
  const res = await fetch(
    `${INDEXER_BASE_URL}/v2/sitemap?kind=${kind}&page=${page}&pageSize=${pageSize}`,
    { next: { revalidate: SITEMAP_REVALIDATE_SECONDS } }
  );
  if (!res.ok) {
    throw new Error(`sitemap ${kind}/${page} fetch failed: HTTP ${res.status}`);
  }
  const data = (await res.json()) as { urls?: string[] };
  return (data.urls ?? []).map(canonicalizeSitemapUrl);
}

// Server-only. Fetches a kind's complete URL list for the consolidated per-kind
// sitemap. Pages sequentially (indexer-rate-limit friendly; each page is its
// own Data Cache entry, safely under Vercel's 2MB per-entry cap) until a short
// page marks the end — complete by construction, with no dependence on a
// counts snapshot that could disagree with the page data. Any failed page
// throws, so a partial list is never served as if complete — SWR keeps the
// last good response instead. Page count is capped at the per-file URL limit;
// kinds bigger than that are served by the chunked routes, not this path.
export async function fetchAllSitemapKindUrls(kind: SitemapKind): Promise<string[]> {
  const maxPages = Math.ceil(MAX_URLS_PER_SITEMAP / INDEXER_FETCH_PAGE_SIZE);
  const urls: string[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const pageUrls = await fetchSitemapKindPage(kind, page, INDEXER_FETCH_PAGE_SIZE);
    urls.push(...pageUrls);
    if (pageUrls.length < INDEXER_FETCH_PAGE_SIZE) break;
  }
  return urls;
}

// Server-only. Builds the sitemap index body: the two local-data children
// (static, communities) plus one consolidated child per kind, sized from the
// live counts. A kind that outgrows MAX_URLS_PER_SITEMAP falls back to the
// legacy chunked URLs, so growth never breaks the index — it just adds files.
export async function buildSitemapIndexBody(): Promise<string> {
  const counts = await fetchSitemapCounts();

  const locs: string[] = [
    `${SITE_URL}/sitemaps/static/sitemap.xml`,
    `${SITE_URL}/sitemaps/communities/sitemap.xml`,
  ];

  for (const { kind } of INDEXED_SITEMAP_KINDS) {
    const total = countForKind(counts, kind);
    // A missing count (partial payload) lists the consolidated child rather
    // than dropping the kind — the child route derives completeness from the
    // page data itself, not from this count. The threshold is strict (`<`) to
    // match the consolidated route's truncation guard, which 404s at exactly
    // MAX_URLS_PER_SITEMAP (it can't prove that list isn't truncated): a kind
    // sitting on the boundary must be listed as chunks, never as a child the
    // route would 404.
    if (!Number.isFinite(total) || total < MAX_URLS_PER_SITEMAP) {
      locs.push(`${SITE_URL}/sitemaps/${kind}/sitemap.xml`);
    } else {
      const chunks = chunkCountFromTotal(total);
      for (let page = 1; page <= chunks; page++) {
        locs.push(`${SITE_URL}/sitemaps/${kind}/sitemap/${page}.xml`);
      }
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
