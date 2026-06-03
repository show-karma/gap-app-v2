import * as fs from "node:fs";
import * as path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..");
const SITE_URL = "https://www.karmahq.xyz";
// Must match SITEMAP_PAGE_SIZE in utilities/sitemap.ts. GSC fails on >~1MB / 5000 URLs.
const SITEMAP_PAGE_SIZE = 1000;
// Per-page fetch budget. The first page of a kind can be a cold cache miss on
// the indexer (a heavy aggregation); give it room rather than ship a degraded
// sitemap. The indexer-side cache warmer normally keeps this well under a
// second.
const URLS_TIMEOUT_MS = 30_000;
const URLS_MAX_ATTEMPTS = 3;
const URLS_RETRY_BACKOFF_MS = 750;
const FALLBACK_CHUNKS_PER_KIND = 1;
// Sanity ceiling for a chunk number parsed from an existing index — ~100M URLs
// at SITEMAP_PAGE_SIZE per chunk. Guards the chunk-emitting loops against a
// corrupt or hand-edited index whose digits would otherwise drive an
// effectively unbounded loop at build time.
const MAX_REASONABLE_CHUNKS = 100_000;

type SitemapKind = "projects" | "impacts" | "grants" | "milestones" | "funding-programs";

interface KindMeta {
  kind: SitemapKind;
  path: string;
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly";
}

// Static per-kind metadata. Chunk counts are NOT configured here — they are
// derived at build time by paging the URL endpoint (the same source that fills
// the child files), so the index and the files can never disagree.
const KIND_META: KindMeta[] = [
  { kind: "projects", path: "projects", priority: 0.8, changeFrequency: "daily" },
  { kind: "impacts", path: "impacts", priority: 0.7, changeFrequency: "weekly" },
  { kind: "grants", path: "grants", priority: 0.6, changeFrequency: "weekly" },
  { kind: "milestones", path: "milestones", priority: 0.5, changeFrequency: "weekly" },
  { kind: "funding-programs", path: "funding-programs", priority: 0.6, changeFrequency: "weekly" },
];

interface KindConfig extends KindMeta {
  chunkCount: number;
  // URL pages already fetched for this kind; pages[i] holds chunk i+1's URLs.
  // Chunks listed beyond pages.length (held up by the floor) are emitted empty.
  pages: string[][];
}

interface SitemapUrlsResponse {
  urls?: string[];
}

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf-8");

  for (const rawLine of content.split("\n")) {
    const line = rawLine.replace(/\r$/, "").trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if (process.env[key] !== undefined) continue;

    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
  }
}

function formatLastmod(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function logInfo(message: string): void {
  process.stdout.write(`${message}\n`);
}

function logWarn(message: string): void {
  process.stderr.write(`${message}\n`);
}

/**
 * Parses the chunk count previously published for each kind from an existing
 * sitemap index. Used as a floor so a transient `/counts` failure (which makes
 * every kind look empty) can never shrink the published chunk count: dropping
 * a chunk would 404 child sitemaps Google has already crawled and recorded in
 * its sitemap-index drilldown. Returns `{}` when the index is absent/unreadable.
 */
function readPublishedChunkCounts(indexPath: string): Record<string, number> {
  const counts: Record<string, number> = {};
  if (!fs.existsSync(indexPath)) return counts;

  let content: string;
  try {
    content = fs.readFileSync(indexPath, "utf-8");
  } catch {
    return counts;
  }

  const pattern = /\/sitemaps\/([a-z-]+)\/sitemap\/(\d+)\.xml/g;
  for (const match of content.matchAll(pattern)) {
    const kindPath = match[1];
    const chunk = Number.parseInt(match[2], 10);
    if (!Number.isInteger(chunk) || chunk < 1 || chunk > MAX_REASONABLE_CHUNKS) continue;
    counts[kindPath] = Math.max(counts[kindPath] ?? 0, chunk);
  }
  return counts;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Sitemaps must list canonical production URLs. The indexer builds child URLs
// from its own configured host, so a preview build wired to the staging indexer
// emits staging URLs. Rewrite every child URL's origin to SITE_URL — matching
// the canonical host already hardcoded for the index entries.
function canonicalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${SITE_URL}${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return url;
  }
}

async function fetchUrlsOnce(baseUrl: string, kind: SitemapKind, page: number): Promise<string[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), URLS_TIMEOUT_MS);
  try {
    const res = await fetch(
      `${baseUrl}/v2/sitemap?kind=${kind}&page=${page}&pageSize=${SITEMAP_PAGE_SIZE}`,
      { signal: controller.signal }
    );
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = (await res.json()) as SitemapUrlsResponse;
    return data.urls ?? [];
  } finally {
    clearTimeout(timer);
  }
}

async function fetchUrls(
  baseUrl: string,
  kind: SitemapKind,
  page: number
): Promise<string[] | null> {
  for (let attempt = 1; attempt <= URLS_MAX_ATTEMPTS; attempt++) {
    try {
      return await fetchUrlsOnce(baseUrl, kind, page);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isLast = attempt === URLS_MAX_ATTEMPTS;
      logWarn(
        `[sitemap-gen] urls fetch ${kind}/${page} attempt ${attempt}/${URLS_MAX_ATTEMPTS} failed: ${message}${
          isLast ? "" : " — retrying"
        }`
      );
      if (isLast) return null;
      await new Promise((resolve) => setTimeout(resolve, URLS_RETRY_BACKOFF_MS * attempt));
    }
  }
  return null;
}

interface KindFetchResult {
  pages: string[][];
  // true when pagination reached a definitive end (a short or empty page).
  // false when a page fetch failed after retries — the listing is incomplete
  // and the published floor must backfill so nothing is dropped.
  complete: boolean;
}

/**
 * Derives a kind's chunk pages by walking the URL endpoint from page 1 until a
 * page comes back shorter than a full page (the last page) or empty (past the
 * end). The page count IS the chunk count — no separate counts call to time out
 * or disagree with the child files. The indexer caches the full per-kind list
 * on the first page, so subsequent pages are cheap.
 */
async function fetchKindPages(baseUrl: string, kind: SitemapKind): Promise<KindFetchResult> {
  const pages: string[][] = [];

  for (let page = 1; page <= MAX_REASONABLE_CHUNKS; page++) {
    const urls = await fetchUrls(baseUrl, kind, page);
    if (urls === null) return { pages, complete: false };
    if (urls.length === 0) return { pages, complete: true };

    pages.push(urls);
    if (urls.length < SITEMAP_PAGE_SIZE) return { pages, complete: true };
  }

  logWarn(`[sitemap-gen] ${kind}: reached MAX_REASONABLE_CHUNKS — truncating pagination.`);
  return { pages, complete: true };
}

function buildSitemapIndex(locs: string[]): string {
  const now = formatLastmod(new Date());
  const items = locs
    .map((loc) => `  <sitemap>\n    <loc>${loc}</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>\n`;
}

function buildIndexXml(kindConfigs: KindConfig[]): string {
  const entries: string[] = [];

  entries.push(`${SITE_URL}/sitemaps/static/sitemap.xml`);
  entries.push(`${SITE_URL}/sitemaps/communities/sitemap.xml`);

  for (const { path: kindPath, chunkCount } of kindConfigs) {
    for (let i = 1; i <= chunkCount; i++) {
      entries.push(`${SITE_URL}/sitemaps/${kindPath}/sitemap/${i}.xml`);
    }
  }

  return buildSitemapIndex(entries);
}

function buildUrlsetXml(urls: string[], priority: number, changeFrequency: string): string {
  const now = formatLastmod(new Date());
  const items = urls
    .map(
      (url) =>
        `  <url>\n    <loc>${escapeXml(canonicalizeUrl(url))}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${changeFrequency}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>\n`;
}

function writeChildSitemaps(kindConfigs: KindConfig[]): void {
  let total = 0;
  let writtenWithUrls = 0;
  let writtenEmpty = 0;

  for (const config of kindConfigs) {
    // Reset the kind's output directory so stale chunks from a previous build
    // (when chunk count was higher) do not linger.
    const kindDir = path.join(PROJECT_ROOT, "public", "sitemaps", config.path, "sitemap");
    fs.rmSync(kindDir, { recursive: true, force: true });
    fs.mkdirSync(kindDir, { recursive: true });

    for (let i = 1; i <= config.chunkCount; i++) {
      // Chunks beyond the fetched pages (held up by the floor) are emitted empty
      // so every chunk listed in the index has a real file — never a 404.
      const urls = config.pages[i - 1] ?? [];
      const xml = buildUrlsetXml(urls, config.priority, config.changeFrequency);
      fs.writeFileSync(path.join(kindDir, `${i}.xml`), xml, "utf-8");
      total++;
      if (urls.length > 0) writtenWithUrls++;
      else writtenEmpty++;
    }
  }

  logInfo(
    `[sitemap-gen] Wrote ${total} child sitemap(s): ${writtenWithUrls} with URLs, ${writtenEmpty} empty.`
  );
}

async function main() {
  loadEnvFile(path.join(PROJECT_ROOT, ".env.local"));
  loadEnvFile(path.join(PROJECT_ROOT, ".env"));

  const baseUrl = process.env.NEXT_PUBLIC_GAP_INDEXER_URL;
  if (!baseUrl) {
    logWarn(
      "[sitemap-gen] NEXT_PUBLIC_GAP_INDEXER_URL is not set — writing fallback sitemapindex."
    );
  }

  const publicDir = path.join(PROJECT_ROOT, "public");
  const indexPath = path.join(publicDir, "sitemap.xml");

  // Floor each kind's chunk count at what the existing index already published,
  // so a transient fetch failure can never shrink the index or 404 a child
  // sitemap Google has already crawled.
  const publishedFloor = readPublishedChunkCounts(indexPath);

  // Fetch kinds SEQUENTIALLY, not in parallel. Each kind's first page can
  // trigger a heavy aggregation on the indexer; firing all kinds at once is the
  // cold-start stampede that made these fetches time out. One at a time keeps
  // the indexer responsive (and with the indexer-side cache warmer, page 1 is
  // already warm).
  const degradedKinds: string[] = [];
  const kindConfigs: KindConfig[] = [];

  for (const meta of KIND_META) {
    const { pages, complete } = baseUrl
      ? await fetchKindPages(baseUrl, meta.kind)
      : { pages: [] as string[][], complete: false };

    const floor = publishedFloor[meta.path] ?? 0;
    const chunkCount = Math.max(pages.length, floor, FALLBACK_CHUNKS_PER_KIND);

    // An established kind (one with previously-published chunks) whose listing
    // came back incomplete would ship empty/partial child sitemaps — the silent
    // degradation that dropped thousands of URLs from Google's index. Refuse to
    // write a regressed sitemap: fail the build so the last good one stays live.
    // (A brand-new kind with no floor has nothing to regress, so an incomplete
    // listing just falls back to a single chunk.)
    if (!complete && floor > 0) {
      degradedKinds.push(`${meta.path} (fetched ${pages.length} page(s), floor ${floor})`);
    } else if (!complete) {
      logWarn(
        `[sitemap-gen] ${meta.path}: URL listing incomplete and no published ` +
          `floor — emitting ${chunkCount} fallback chunk(s).`
      );
    }

    kindConfigs.push({ ...meta, chunkCount, pages });
  }

  if (degradedKinds.length > 0) {
    // Thrown before anything is written, so the committed sitemap is untouched.
    throw new Error(
      `Refusing to write a degraded sitemap: ${degradedKinds.length} established ` +
        `kind(s) failed to fully fetch and would ship empty child sitemaps — ` +
        `${degradedKinds.join("; ")}. The indexer ` +
        `(${baseUrl ?? "NEXT_PUBLIC_GAP_INDEXER_URL unset"}) was slow or unreachable. ` +
        `Existing sitemap left untouched; re-run once the indexer is responsive.`
    );
  }

  const indexXml = buildIndexXml(kindConfigs);
  fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(indexPath, indexXml, "utf-8");

  const indexEntryCount = (indexXml.match(/<sitemap>/g) ?? []).length;
  logInfo(`[sitemap-gen] Wrote ${indexPath} (${indexEntryCount} entries)`);

  // Alias served at a distinct URL so GSC's per-URL fetch-state machine treats it as
  // a fresh submission, independent of any stuck backoff on /sitemap.xml.
  const aliasPath = path.join(publicDir, "sitemap-index.xml");
  fs.writeFileSync(aliasPath, indexXml, "utf-8");
  logInfo(`[sitemap-gen] Wrote ${aliasPath} (${indexEntryCount} entries)`);

  writeChildSitemaps(kindConfigs);
}

main().catch((err) => {
  const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
  logWarn(`[sitemap-gen] Fatal error: ${message}`);
  process.exit(1);
});
