import * as fs from "node:fs";
import * as path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..");
const SITE_URL = "https://www.karmahq.xyz";
const SITEMAP_PAGE_SIZE = 5000;
const COUNTS_TIMEOUT_MS = 8000;
const COUNTS_MAX_ATTEMPTS = 3;
const COUNTS_RETRY_BACKOFF_MS = 1000;
const FALLBACK_CHUNKS_PER_KIND = 1;

type SitemapKind = "projects" | "impacts" | "grants" | "milestones" | "funding-programs";

interface SitemapCounts {
  projects: number;
  impacts: number;
  grants: number;
  milestones: number;
  fundingPrograms: number;
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

function buildXml(counts: SitemapCounts | null): string {
  const now = formatLastmod(new Date());
  const entries: string[] = [];

  entries.push(`${SITE_URL}/sitemaps/static/sitemap.xml`);
  entries.push(`${SITE_URL}/sitemaps/communities/sitemap.xml`);

  const kindConfig: Array<{ kind: SitemapKind; total: number; path: string }> = [
    { kind: "projects", total: counts?.projects ?? 0, path: "projects" },
    { kind: "impacts", total: counts?.impacts ?? 0, path: "impacts" },
    { kind: "grants", total: counts?.grants ?? 0, path: "grants" },
    { kind: "milestones", total: counts?.milestones ?? 0, path: "milestones" },
    { kind: "funding-programs", total: counts?.fundingPrograms ?? 0, path: "funding-programs" },
  ];

  for (const { total, path: kindPath } of kindConfig) {
    const chunkCount = computeChunkCount(total);
    for (let i = 1; i <= chunkCount; i++) {
      entries.push(`${SITE_URL}/sitemaps/${kindPath}/sitemap/${i}.xml`);
    }
  }

  const items = entries
    .map((loc) => `  <sitemap>\n    <loc>${loc}</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>\n`;
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
      "[sitemap-gen] Using fallback counts (one chunk per kind). Build will succeed; Google will discover additional chunks on next deploy."
    );
  }

  const xml = buildXml(counts);
  const outPath = path.join(PROJECT_ROOT, "public", "sitemap.xml");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, xml, "utf-8");

  const entryCount = (xml.match(/<sitemap>/g) ?? []).length;
  logInfo(`[sitemap-gen] Wrote ${outPath} (${entryCount} entries)`);
}

main().catch((err) => {
  const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
  logWarn(`[sitemap-gen] Fatal error: ${message}`);
  process.exit(1);
});
