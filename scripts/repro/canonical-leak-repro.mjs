#!/usr/bin/env node
// SSR cross-request canonical-leak repro/verification harness.
//
// Fires concurrent Googlebot requests at a running deployment, interleaving
// project + community renders against the same warm SSR instance, then checks
// that each response's <link rel="canonical"> points at the requested entity
// (not a different project/community slug leaked from a concurrent request).
//
// Exit 1 if any canonical leak (mismatch) is detected, else 0.

const BASE_URL = (process.argv[2] || process.env.BASE_URL || "https://www.karmahq.xyz").replace(/\/+$/, "");
const CONCURRENCY = Number(process.env.CONCURRENCY || 30);
const ROUNDS = Number(process.env.ROUNDS || 4);
const REQUEST_TIMEOUT_MS = 45_000;
const GOOGLEBOT_UA =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const MAX_SAMPLES = 15;

// Real slugs that exist in production.
const PROJECT_SLUGS = ["karma---governance", "metrom", "poscidondao", "fundacin-salva-terra-1"];
const COMMUNITY_SLUGS = ["arbitrum", "octant", "filecoin", "lisk"];

// ~10 mixed paths: project overview/about/impact + community root/projects/programs.
const PATHS = [
  `/project/${PROJECT_SLUGS[0]}`,
  `/project/${PROJECT_SLUGS[1]}/about`,
  `/project/${PROJECT_SLUGS[2]}/impact`,
  `/project/${PROJECT_SLUGS[3]}`,
  `/project/${PROJECT_SLUGS[0]}/about`,
  `/community/${COMMUNITY_SLUGS[0]}`,
  `/community/${COMMUNITY_SLUGS[1]}/projects`,
  `/community/${COMMUNITY_SLUGS[2]}/programs/1`,
  `/community/${COMMUNITY_SLUGS[3]}`,
  `/community/${COMMUNITY_SLUGS[0]}/projects`,
];

const CANONICAL_RE = /<link[^>]+rel=["']canonical["'][^>]*>/i;
const HREF_RE = /href=["']([^"']+)["']/i;

/**
 * Reduce a URL or path to a normalized path: scheme/host stripped, trailing
 * slash removed, query/hash dropped, lowercased.
 */
function normalizePath(input) {
  if (!input) return "";
  let path = input;
  try {
    // Absolute URL -> pathname. Relative -> resolve against a dummy origin.
    path = new URL(input, "http://x").pathname;
  } catch {
    path = input.split(/[?#]/)[0];
  }
  path = path.split(/[?#]/)[0];
  path = path.replace(/\/+$/, "");
  return path.toLowerCase() || "/";
}

/** Extract the canonical href path from an HTML string, or null. */
function extractCanonicalPath(html) {
  const tag = html.match(CANONICAL_RE);
  if (!tag) return null;
  const href = tag[0].match(HREF_RE);
  if (!href) return null;
  return normalizePath(href[1]);
}

/**
 * Parse a /project/<slug> or /community/<slug> path into {kind, slug}.
 * Returns null if it is neither.
 */
function parseEntity(path) {
  const m = normalizePath(path).match(/^\/(project|community)\/([^/]+)/);
  if (!m) return null;
  return { kind: m[1], slug: m[2] };
}

/**
 * A canonical is OK when it points at the same entity kind + slug as the
 * request. The canonical may be a shorter overview path (e.g. request
 * /project/x/about -> canonical /project/x), which is still the same entity.
 * A canonical pointing at a DIFFERENT slug (or different kind) is a leak.
 */
function isOk(requestedPath, canonicalPath) {
  const req = parseEntity(requestedPath);
  const can = parseEntity(canonicalPath);
  if (!req) return true; // non-entity path; nothing to compare
  if (!can) return false; // entity request but canonical is not an entity page
  return req.kind === can.kind && req.slug === can.slug;
}

async function fetchHtml(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        "User-Agent": GOOGLEBOT_UA,
        Accept: "text/html",
      },
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
    });
    const html = await res.text();
    return { ok: true, status: res.status, html };
  } catch (err) {
    return { ok: false, error: err && err.name === "AbortError" ? "timeout" : String(err && err.message || err) };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const stats = {
    total: 0,
    ok: 0,
    mismatches: 0,
    noCanonical: 0,
    errors: 0,
  };
  const samples = [];
  let cursor = 0;

  console.log(`Canonical-leak repro against: ${BASE_URL}`);
  console.log(`Concurrency=${CONCURRENCY} Rounds=${ROUNDS} Paths=${PATHS.length}`);
  console.log("");

  for (let round = 0; round < ROUNDS; round++) {
    const batch = [];
    for (let i = 0; i < CONCURRENCY; i++) {
      const path = PATHS[cursor % PATHS.length];
      cursor++;
      batch.push((async () => {
        stats.total++;
        const result = await fetchHtml(path);
        if (!result.ok) {
          stats.errors++;
          return;
        }
        const canonicalPath = extractCanonicalPath(result.html);
        if (canonicalPath === null) {
          stats.noCanonical++;
          return;
        }
        if (isOk(path, canonicalPath)) {
          stats.ok++;
          return;
        }
        stats.mismatches++;
        if (samples.length < MAX_SAMPLES) {
          samples.push({ requested: path, canonicalReturned: canonicalPath });
        }
      })());
    }
    await Promise.all(batch);
    console.log(
      `Round ${round + 1}/${ROUNDS} done — total=${stats.total} ok=${stats.ok} mismatches=${stats.mismatches} noCanonical=${stats.noCanonical} errors=${stats.errors}`,
    );
  }

  const checked = stats.ok + stats.mismatches;
  const rate = checked > 0 ? ((stats.mismatches / checked) * 100).toFixed(2) : "0.00";

  console.log("");
  console.log("===== Summary =====");
  console.log(`Base URL:        ${BASE_URL}`);
  console.log(`Total requests:  ${stats.total}`);
  console.log(`OK:              ${stats.ok}`);
  console.log(`Mismatches:      ${stats.mismatches} (${rate}% of ${checked} canonical'd responses)`);
  console.log(`No canonical:    ${stats.noCanonical}`);
  console.log(`Network errors:  ${stats.errors}`);

  if (samples.length > 0) {
    console.log("");
    console.log(`Sample mismatches (up to ${MAX_SAMPLES}):`);
    for (const sample of samples) {
      console.log(`  requested ${sample.requested}  ->  canonical ${sample.canonicalReturned}`);
    }
  }

  console.log("");
  console.log(stats.mismatches > 0 ? "RESULT: LEAK DETECTED" : "RESULT: NO LEAK");

  process.exit(stats.mismatches > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Harness crashed:", err);
  process.exit(2);
});
