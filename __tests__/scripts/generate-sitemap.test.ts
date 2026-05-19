import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const OUTPUT = path.join(PROJECT_ROOT, "public", "sitemap.xml");

function runScript(env: NodeJS.ProcessEnv): string {
  execFileSync("npm", ["run", "--silent", "generate-sitemap"], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, ...env },
    stdio: "pipe",
  });
  return fs.readFileSync(OUTPUT, "utf-8");
}

describe("generate-sitemap", () => {
  let originalContents: string | null = null;
  let hadOriginalFile = false;

  function snapshot() {
    hadOriginalFile = fs.existsSync(OUTPUT);
    originalContents = hadOriginalFile ? fs.readFileSync(OUTPUT, "utf-8") : null;
  }

  afterEach(() => {
    if (hadOriginalFile && originalContents !== null) {
      fs.writeFileSync(OUTPUT, originalContents, "utf-8");
    } else if (!hadOriginalFile && fs.existsSync(OUTPUT)) {
      fs.unlinkSync(OUTPUT);
    }
    originalContents = null;
    hadOriginalFile = false;
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
});
