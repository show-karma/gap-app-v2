#!/usr/bin/env node

/**
 * Batch Lighthouse audit for all solutions pages + key marketing pages.
 *
 * Usage:
 *   node scripts/lighthouse-audit.mjs                  # audit all pages
 *   node scripts/lighthouse-audit.mjs --quick           # audit 5 sample pages
 *   node scripts/lighthouse-audit.mjs --page /foundations  # audit one page
 *
 * Requires: dev server running on localhost:3000, chromium-browser installed.
 */

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const CHROME_PATH = process.env.CHROME_PATH || "/usr/bin/chromium-browser";
const OUTPUT_DIR = resolve(ROOT, "scripts/.lighthouse-results");

// Parse args
const args = process.argv.slice(2);
const quickMode = args.includes("--quick");
const singlePage = args.includes("--page") ? args[args.indexOf("--page") + 1] : null;

// Discover all solution slugs from data files
function getSolutionSlugs() {
  const dataDir = resolve(ROOT, "app/solutions/_data");
  const slugs = [];
  for (const file of readdirSync(dataDir)) {
    if (!file.endsWith(".ts") || file === "types.ts") continue;
    const content = readFileSync(resolve(dataDir, file), "utf-8");
    const matches = content.matchAll(/slug:\s*["']([^"']+)["']/g);
    for (const m of matches) slugs.push(m[1]);
  }
  return slugs;
}

// Marketing pages to always audit
const MARKETING_PAGES = ["/", "/foundations", "/funders", "/seeds", "/solutions"];

function buildPageList() {
  if (singlePage) return [singlePage];

  const slugs = getSolutionSlugs();
  const solutionPages = slugs.map((s) => `/solutions/${s}`);
  const all = [...MARKETING_PAGES, ...solutionPages];

  if (quickMode) {
    // Sample: all marketing + 5 evenly spaced solutions
    const step = Math.floor(solutionPages.length / 5) || 1;
    const sample = solutionPages.filter((_, i) => i % step === 0).slice(0, 5);
    return [...MARKETING_PAGES, ...sample];
  }

  return all;
}

function runLighthouse(urlPath) {
  const url = `${BASE_URL}${urlPath}`;
  const tmpFile = `/tmp/lh-${urlPath.replace(/\//g, "_")}.json`;

  try {
    const npxPath = process.env.NPX_PATH || "npx";
    execFileSync(
      npxPath,
      [
        "lighthouse",
        url,
        "--only-categories=seo,accessibility,best-practices",
        "--output=json",
        `--output-path=${tmpFile}`,
        '--chrome-flags=--headless --no-sandbox --disable-gpu',
        "--quiet",
      ],
      { stdio: "pipe", timeout: 60_000, env: { ...process.env, CHROME_PATH } },
    );

    const data = JSON.parse(readFileSync(tmpFile, "utf-8"));
    const scores = {};
    for (const [cat, val] of Object.entries(data.categories)) {
      scores[cat] = Math.round(val.score * 100);
    }

    // Collect failing audits
    const failures = [];
    for (const cat of Object.values(data.categories)) {
      for (const ref of cat.auditRefs) {
        const audit = data.audits[ref.id];
        if (audit && audit.score === 0) {
          failures.push({ id: ref.id, title: audit.title, category: cat.title });
        }
      }
    }

    return { path: urlPath, scores, failures, error: null };
  } catch (e) {
    return { path: urlPath, scores: null, failures: [], error: e.message?.substring(0, 200) };
  }
}

// Main
const pages = buildPageList();
console.log(`\nAuditing ${pages.length} pages...\n`);

const results = [];
let perfect = 0;
let hasIssues = 0;
let errored = 0;

for (let i = 0; i < pages.length; i++) {
  const page = pages[i];
  process.stdout.write(`[${i + 1}/${pages.length}] ${page} ... `);

  const result = runLighthouse(page);
  results.push(result);

  if (result.error) {
    console.log("ERROR");
    errored++;
  } else {
    const { seo, accessibility } = result.scores;
    const seoFail = result.failures.filter((f) => f.category === "SEO");
    const isPerfectSeo = seo === 100 && accessibility >= 95;
    if (isPerfectSeo) perfect++;
    else hasIssues++;

    console.log(
      `SEO: ${seo}/100  A11y: ${accessibility}/100  BP: ${result.scores["best-practices"]}/100` +
        (seoFail.length ? `  ✗ ${seoFail.map((f) => f.id).join(", ")}` : ""),
    );
  }
}

// Summary
console.log("\n" + "=".repeat(60));
console.log(`SUMMARY: ${pages.length} pages audited`);
console.log(`  Perfect (SEO 100, A11y 95+): ${perfect}`);
console.log(`  Issues: ${hasIssues}`);
console.log(`  Errors: ${errored}`);

// Pages with SEO < 100
const seoIssues = results.filter((r) => r.scores && r.scores.seo < 100);
if (seoIssues.length) {
  console.log("\nPages with SEO < 100:");
  for (const r of seoIssues) {
    console.log(`  ${r.path}: ${r.scores.seo}/100`);
    for (const f of r.failures.filter((f) => f.category === "SEO")) {
      console.log(`    ✗ ${f.id}: ${f.title}`);
    }
  }
}

// Save JSON report
mkdirSync(OUTPUT_DIR, { recursive: true });
const reportPath = resolve(OUTPUT_DIR, `report-${new Date().toISOString().slice(0, 10)}.json`);
writeFileSync(reportPath, JSON.stringify({ date: new Date().toISOString(), results }, null, 2));
console.log(`\nFull report saved to: ${reportPath}`);
