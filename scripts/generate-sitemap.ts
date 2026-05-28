import * as fs from "node:fs";
import * as path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..");
const SITE_URL = "https://www.karmahq.xyz";
// Must match SITEMAP_PAGE_SIZE in utilities/sitemap.ts. GSC fails on >~1MB / 5000 URLs.
const SITEMAP_PAGE_SIZE = 1000;
const COUNTS_TIMEOUT_MS = 8000;
const URLS_TIMEOUT_MS = 15_000;
const COUNTS_MAX_ATTEMPTS = 3;
const URLS_MAX_ATTEMPTS = 3;
const COUNTS_RETRY_BACKOFF_MS = 1000;
const URLS_RETRY_BACKOFF_MS = 750;
const URLS_CONCURRENCY = 4;
const FALLBACK_CHUNKS_PER_KIND = 1;
// Sanity ceiling for a chunk number parsed from an existing index — ~100M URLs
// at SITEMAP_PAGE_SIZE per chunk. Guards the chunk-emitting loops against a
// corrupt or hand-edited index whose digits would otherwise drive an
// effectively unbounded loop at build time.
const MAX_REASONABLE_CHUNKS = 100_000;

type SitemapKind = "projects" | "impacts" | "grants" | "milestones" | "funding-programs";

interface SitemapCounts {
  projects: number;
  impacts: number;
  grants: number;
  milestones: number;
  fundingPrograms: number;
}

interface KindConfig {
  kind: SitemapKind;
  path: string;
  chunkCount: number;
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly";
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

function computeChunkCount(total: number): number {
  if (total <= 0) return FALLBACK_CHUNKS_PER_KIND;
  return Math.ceil(total / SITEMAP_PAGE_SIZE);
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

async function fetchCountsOnce(baseUrl: string): Promise<SitemapCounts | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COUNTS_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}/v2/sitemap/counts`, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return (await res.json()) as SitemapCounts;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchCounts(baseUrl: string): Promise<SitemapCounts | null> {
  for (let attempt = 1; attempt <= COUNTS_MAX_ATTEMPTS; attempt++) {
    try {
      return await fetchCountsOnce(baseUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isLast = attempt === COUNTS_MAX_ATTEMPTS;
      logWarn(
        `[sitemap-gen] counts fetch attempt ${attempt}/${COUNTS_MAX_ATTEMPTS} failed: ${message}${
          isLast ? "" : " — retrying"
        }`
      );
      if (isLast) return null;
      await new Promise((resolve) => setTimeout(resolve, COUNTS_RETRY_BACKOFF_MS * attempt));
    }
  }
  return null;
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
        `  <url>\n    <loc>${escapeXml(url)}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${changeFrequency}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>\n`;
}

async function writeChildSitemaps(
  baseUrl: string | undefined,
  kindConfigs: KindConfig[]
): Promise<void> {
  interface Job {
    config: KindConfig;
    chunkId: number;
    outPath: string;
  }

  const jobs: Job[] = [];
  for (const config of kindConfigs) {
    // Reset the kind's output directory so stale chunks from a previous build
    // (when chunk count was higher) do not linger.
    const kindDir = path.join(PROJECT_ROOT, "public", "sitemaps", config.path, "sitemap");
    fs.rmSync(kindDir, { recursive: true, force: true });
    fs.mkdirSync(kindDir, { recursive: true });

    for (let i = 1; i <= config.chunkCount; i++) {
      jobs.push({
        config,
        chunkId: i,
        outPath: path.join(kindDir, `${i}.xml`),
      });
    }
  }

  let cursor = 0;
  let writtenWithUrls = 0;
  let writtenEmpty = 0;

  async function worker() {
    while (cursor < jobs.length) {
      const index = cursor++;
      const job = jobs[index];
      const urls = baseUrl ? await fetchUrls(baseUrl, job.config.kind, job.chunkId) : null;
      const effectiveUrls = urls ?? [];
      const xml = buildUrlsetXml(effectiveUrls, job.config.priority, job.config.changeFrequency);
      fs.writeFileSync(job.outPath, xml, "utf-8");
      if (effectiveUrls.length > 0) writtenWithUrls++;
      else writtenEmpty++;
    }
  }

  const workers = Array.from({ length: Math.min(URLS_CONCURRENCY, jobs.length) }, () => worker());
  await Promise.all(workers);

  logInfo(
    `[sitemap-gen] Wrote ${jobs.length} child sitemap(s): ${writtenWithUrls} with URLs, ${writtenEmpty} empty.`
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

  const counts = baseUrl ? await fetchCounts(baseUrl) : null;
  if (!counts) {
    logWarn(
      "[sitemap-gen] Counts unavailable — preserving the previously-published chunk count per kind so no child sitemap is dropped. Build will succeed."
    );
  }

  const publicDir = path.join(PROJECT_ROOT, "public");
  const indexPath = path.join(publicDir, "sitemap.xml");

  // Floor each kind's chunk count at what the existing index already published.
  // This is the durable guard against a transient `/counts` failure shrinking
  // the index and 404-ing child sitemaps Google has already crawled.
  const publishedFloor = readPublishedChunkCounts(indexPath);
  const chunksFor = (kindPath: string, total: number): number =>
    Math.max(computeChunkCount(total), publishedFloor[kindPath] ?? 0);

  const kindConfigs: KindConfig[] = [
    {
      kind: "projects",
      path: "projects",
      chunkCount: chunksFor("projects", counts?.projects ?? 0),
      priority: 0.8,
      changeFrequency: "daily",
    },
    {
      kind: "impacts",
      path: "impacts",
      chunkCount: chunksFor("impacts", counts?.impacts ?? 0),
      priority: 0.7,
      changeFrequency: "weekly",
    },
    {
      kind: "grants",
      path: "grants",
      chunkCount: chunksFor("grants", counts?.grants ?? 0),
      priority: 0.6,
      changeFrequency: "weekly",
    },
    {
      kind: "milestones",
      path: "milestones",
      chunkCount: chunksFor("milestones", counts?.milestones ?? 0),
      priority: 0.5,
      changeFrequency: "weekly",
    },
    {
      kind: "funding-programs",
      path: "funding-programs",
      chunkCount: chunksFor("funding-programs", counts?.fundingPrograms ?? 0),
      priority: 0.6,
      changeFrequency: "weekly",
    },
  ];

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

  await writeChildSitemaps(baseUrl, kindConfigs);
}

main().catch((err) => {
  const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
  logWarn(`[sitemap-gen] Fatal error: ${message}`);
  process.exit(1);
});
