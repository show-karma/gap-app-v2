import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const INDEX_OUTPUT = path.join(PROJECT_ROOT, "public", "sitemap.xml");
const ALIAS_OUTPUT = path.join(PROJECT_ROOT, "public", "sitemap-index.xml");
const SITEMAPS_ROOT = path.join(PROJECT_ROOT, "public", "sitemaps");
const KIND_DIRS = ["projects", "impacts", "grants", "milestones", "funding-programs"] as const;

function runScript(env: NodeJS.ProcessEnv): string {
  execFileSync("npm", ["run", "--silent", "generate-sitemap"], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, ...env },
    stdio: "pipe",
  });
  return fs.readFileSync(INDEX_OUTPUT, "utf-8");
}

describe("generate-sitemap", () => {
  let originalIndex: string | null = null;
  let hadOriginalIndex = false;
  let originalAlias: string | null = null;
  let hadOriginalAlias = false;
  const originalChildren = new Map<string, string>();

  function snapshot() {
    hadOriginalIndex = fs.existsSync(INDEX_OUTPUT);
    originalIndex = hadOriginalIndex ? fs.readFileSync(INDEX_OUTPUT, "utf-8") : null;
    hadOriginalAlias = fs.existsSync(ALIAS_OUTPUT);
    originalAlias = hadOriginalAlias ? fs.readFileSync(ALIAS_OUTPUT, "utf-8") : null;

    originalChildren.clear();
    for (const kind of KIND_DIRS) {
      const dir = path.join(SITEMAPS_ROOT, kind, "sitemap");
      if (!fs.existsSync(dir)) continue;
      for (const file of fs.readdirSync(dir)) {
        const full = path.join(dir, file);
        if (fs.statSync(full).isFile()) {
          originalChildren.set(full, fs.readFileSync(full, "utf-8"));
        }
      }
    }
  }

  afterEach(() => {
    if (hadOriginalIndex && originalIndex !== null) {
      fs.writeFileSync(INDEX_OUTPUT, originalIndex, "utf-8");
    } else if (!hadOriginalIndex && fs.existsSync(INDEX_OUTPUT)) {
      fs.unlinkSync(INDEX_OUTPUT);
    }
    if (hadOriginalAlias && originalAlias !== null) {
      fs.writeFileSync(ALIAS_OUTPUT, originalAlias, "utf-8");
    } else if (!hadOriginalAlias && fs.existsSync(ALIAS_OUTPUT)) {
      fs.unlinkSync(ALIAS_OUTPUT);
    }
    originalIndex = null;
    hadOriginalIndex = false;
    originalAlias = null;
    hadOriginalAlias = false;

    for (const kind of KIND_DIRS) {
      const dir = path.join(SITEMAPS_ROOT, kind, "sitemap");
      fs.rmSync(dir, { recursive: true, force: true });
    }
    for (const [file, content] of originalChildren) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content, "utf-8");
    }
    originalChildren.clear();
  });

  it("falls back to a minimal sitemapindex when the indexer is unreachable", () => {
    snapshot();

    const xml = runScript({ NEXT_PUBLIC_GAP_INDEXER_URL: "http://127.0.0.1:9" });

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("<sitemapindex");
    expect(xml).toContain("https://www.karmahq.xyz/sitemaps/static/sitemap.xml");
    expect(xml).toContain("https://www.karmahq.xyz/sitemaps/communities/sitemap.xml");
    // static + communities + 1 chunk per 5 kinds = 7
    expect(xml.match(/<sitemap>/g) ?? []).toHaveLength(7);
  }, 30_000);

  it("emits lastmod values without fractional seconds (Google parser strictness)", () => {
    snapshot();

    const xml = runScript({ NEXT_PUBLIC_GAP_INDEXER_URL: "http://127.0.0.1:9" });

    const lastmodMatches = xml.match(/<lastmod>([^<]+)<\/lastmod>/g) ?? [];
    expect(lastmodMatches.length).toBeGreaterThan(0);
    for (const tag of lastmodMatches) {
      expect(tag).not.toMatch(/\.\d{3}Z/);
      expect(tag).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z<\/lastmod>/);
    }
  }, 30_000);

  it("emits a child urlset XML file for every kind chunk listed in the index", () => {
    snapshot();

    runScript({ NEXT_PUBLIC_GAP_INDEXER_URL: "http://127.0.0.1:9" });

    for (const kind of KIND_DIRS) {
      const file = path.join(SITEMAPS_ROOT, kind, "sitemap", "1.xml");
      expect(fs.existsSync(file), `expected ${file} to exist`).toBe(true);
      const content = fs.readFileSync(file, "utf-8");
      expect(content).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(content).toContain("<urlset");
    }
  }, 30_000);

  it("removes stale child chunks from a previous build before writing", () => {
    snapshot();

    const staleDir = path.join(SITEMAPS_ROOT, "projects", "sitemap");
    fs.mkdirSync(staleDir, { recursive: true });
    const stalePath = path.join(staleDir, "999.xml");
    fs.writeFileSync(stalePath, "<stale/>", "utf-8");

    runScript({ NEXT_PUBLIC_GAP_INDEXER_URL: "http://127.0.0.1:9" });

    expect(fs.existsSync(stalePath)).toBe(false);
    expect(fs.existsSync(path.join(staleDir, "1.xml"))).toBe(true);
  }, 30_000);

  it("emits sitemap-index.xml with byte-identical content to sitemap.xml", () => {
    snapshot();

    runScript({ NEXT_PUBLIC_GAP_INDEXER_URL: "http://127.0.0.1:9" });

    expect(fs.existsSync(ALIAS_OUTPUT), `expected ${ALIAS_OUTPUT} to exist`).toBe(true);
    const primary = fs.readFileSync(INDEX_OUTPUT, "utf-8");
    const alias = fs.readFileSync(ALIAS_OUTPUT, "utf-8");
    expect(alias).toBe(primary);
  }, 30_000);
});
