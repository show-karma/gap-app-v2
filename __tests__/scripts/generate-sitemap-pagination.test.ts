import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as http from "node:http";
import type { AddressInfo } from "node:net";
import * as path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const INDEX_OUTPUT = path.join(PROJECT_ROOT, "public", "sitemap.xml");
const ALIAS_OUTPUT = path.join(PROJECT_ROOT, "public", "sitemap-index.xml");
const SITEMAPS_ROOT = path.join(PROJECT_ROOT, "public", "sitemaps");
const KIND_DIRS = ["projects", "impacts", "grants", "milestones", "funding-programs"] as const;
const PAGE_SIZE = 1000;

// Fake indexer: grants spans three chunks (1000, 1000, 300 → last page short),
// every other kind is a single short page. The script must discover the chunk
// count purely by paging until a short page — no /counts call.
const PAGE_SIZES: Record<string, number[]> = {
  grants: [PAGE_SIZE, PAGE_SIZE, 300],
};

function urlsFor(kind: string, page: number): string[] {
  const size = (PAGE_SIZES[kind] ?? [3])[page - 1] ?? 0;
  return Array.from({ length: size }, (_, i) => `https://www.karmahq.xyz/x/${kind}/${page}/${i}`);
}

function locCount(file: string): number {
  return (fs.readFileSync(file, "utf-8").match(/<loc>/g) ?? []).length;
}

describe("generate-sitemap pagination", () => {
  let server: http.Server;
  let baseUrl: string;

  // Saved working-tree state so the test never leaves generated artifacts behind.
  let originalIndex: string | null = null;
  let originalAlias: string | null = null;
  const originalChildren = new Map<string, string>();

  beforeEach(async () => {
    originalIndex = fs.existsSync(INDEX_OUTPUT) ? fs.readFileSync(INDEX_OUTPUT, "utf-8") : null;
    originalAlias = fs.existsSync(ALIAS_OUTPUT) ? fs.readFileSync(ALIAS_OUTPUT, "utf-8") : null;
    originalChildren.clear();
    for (const kind of KIND_DIRS) {
      const dir = path.join(SITEMAPS_ROOT, kind, "sitemap");
      if (!fs.existsSync(dir)) continue;
      for (const file of fs.readdirSync(dir)) {
        const full = path.join(dir, file);
        if (fs.statSync(full).isFile()) originalChildren.set(full, fs.readFileSync(full, "utf-8"));
      }
    }

    // Cold start: no prior index → chunk counts come purely from pagination.
    if (fs.existsSync(INDEX_OUTPUT)) fs.unlinkSync(INDEX_OUTPUT);
    if (fs.existsSync(ALIAS_OUTPUT)) fs.unlinkSync(ALIAS_OUTPUT);

    server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "", "http://localhost");
      if (url.pathname === "/v2/sitemap") {
        const kind = url.searchParams.get("kind") ?? "";
        const page = Number(url.searchParams.get("page") ?? "1");
        const urls = urlsFor(kind, page);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ kind, page, pageSize: PAGE_SIZE, total: urls.length, urls }));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));

    for (const kind of KIND_DIRS) {
      fs.rmSync(path.join(SITEMAPS_ROOT, kind, "sitemap"), { recursive: true, force: true });
    }
    for (const [file, content] of originalChildren) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content, "utf-8");
    }
    if (originalIndex !== null) fs.writeFileSync(INDEX_OUTPUT, originalIndex, "utf-8");
    else if (fs.existsSync(INDEX_OUTPUT)) fs.unlinkSync(INDEX_OUTPUT);
    if (originalAlias !== null) fs.writeFileSync(ALIAS_OUTPUT, originalAlias, "utf-8");
    else if (fs.existsSync(ALIAS_OUTPUT)) fs.unlinkSync(ALIAS_OUTPUT);
  });

  it("derives chunk counts by paging the URL endpoint until a short page", async () => {
    await execFileAsync("npm", ["run", "--silent", "generate-sitemap"], {
      cwd: PROJECT_ROOT,
      env: { ...process.env, NEXT_PUBLIC_GAP_INDEXER_URL: baseUrl },
    });

    const index = fs.readFileSync(INDEX_OUTPUT, "utf-8");

    // grants: 1000 + 1000 + 300 → exactly 3 chunks, no 4th.
    expect(index).toContain("https://www.karmahq.xyz/sitemaps/grants/sitemap/1.xml");
    expect(index).toContain("https://www.karmahq.xyz/sitemaps/grants/sitemap/2.xml");
    expect(index).toContain("https://www.karmahq.xyz/sitemaps/grants/sitemap/3.xml");
    expect(index).not.toContain("https://www.karmahq.xyz/sitemaps/grants/sitemap/4.xml");

    // single short page → exactly one chunk.
    expect(index).toContain("https://www.karmahq.xyz/sitemaps/projects/sitemap/1.xml");
    expect(index).not.toContain("https://www.karmahq.xyz/sitemaps/projects/sitemap/2.xml");

    // child files carry the paged URLs, not a refetch.
    expect(locCount(path.join(SITEMAPS_ROOT, "grants", "sitemap", "1.xml"))).toBe(PAGE_SIZE);
    expect(locCount(path.join(SITEMAPS_ROOT, "grants", "sitemap", "3.xml"))).toBe(300);
  }, 30_000);
});
