/**
 * Record the D2 parity evidence against a live indexer.
 *
 * For each endpoint the four public loaders hit, fetch it twice — once with no
 * Authorization header and once with whatever token is in INDEXER_TOKEN — and
 * report whether the payloads are byte-identical after removing volatile
 * fields. Writes a fixture the pinned test asserts against.
 *
 *   INDEXER_TOKEN=<staging privy jwt> node scripts/record-d2-parity.mjs
 *
 * With no INDEXER_TOKEN the "with auth" leg is skipped and the fixture records
 * only the anonymous shape, which is still the half that matters for caching:
 * it proves the endpoint serves a complete public payload with no credential.
 */

const BASE = process.argv[2] ?? "https://gapstagapi.karmahq.xyz";
const OUT = process.argv[3] ?? "__tests__/fixtures/d2/public-payload-parity.raw.json";
const TOKEN = process.env.INDEXER_TOKEN ?? "";

/** The repo forbids `console` in committed code; scripts write to stdout directly. */
const say = (line) =>
  process.stdout.write(`${line}
`);

/** Fields that legitimately change between two calls seconds apart. */
const VOLATILE = new Set(["updatedAt", "createdAt", "lastUpdated", "timestamp", "cachedAt"]);

function stripVolatile(value) {
  if (Array.isArray(value)) return value.map(stripVolatile);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (VOLATILE.has(k)) continue;
      out[k] = stripVolatile(v);
    }
    return out;
  }
  return value;
}

/** Every key present anywhere in the payload, so a field appearing only with a token shows up. */
function keyPaths(value, prefix = "", acc = new Set()) {
  if (Array.isArray(value)) {
    for (const v of value.slice(0, 3)) keyPaths(v, `${prefix}[]`, acc);
    return acc;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      acc.add(`${prefix}.${k}`);
      keyPaths(v, `${prefix}.${k}`, acc);
    }
  }
  return acc;
}

async function get(path, withAuth) {
  const headers = { accept: "application/json" };
  if (withAuth && TOKEN) headers.authorization = `Bearer ${TOKEN}`;
  const res = await fetch(BASE + path, { headers });
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = { __unparsed__: text.slice(0, 200) };
  }
  return { status: res.status, body };
}

const ENDPOINTS = [
  { loader: "projects-explorer", name: "projects list", path: "/v2/projects?limit=3" },
  {
    loader: "project.service",
    name: "project by slug",
    path: "/v2/projects?limit=1",
    follow: "slug",
  },
  {
    loader: "funding-programs",
    name: "program registry search",
    path: "/v2/program-registry/search?page=1&pageSize=3",
  },
  { loader: "getCommunityData", name: "community", path: "/v2/communities/gitcoin" },
  { loader: "getCommunityData", name: "community stats", path: "/v2/communities/gitcoin/stats" },
  {
    loader: "getCommunityData",
    name: "community projects",
    path: "/v2/communities/gitcoin/projects?limit=3",
  },
];

const results = [];
for (const ep of ENDPOINTS) {
  const anon = await get(ep.path, false);
  const row = {
    loader: ep.loader,
    name: ep.name,
    path: ep.path,
    anonStatus: anon.status,
    anonKeyPaths: [...keyPaths(anon.body)].sort(),
  };
  if (TOKEN) {
    const authed = await get(ep.path, true);
    row.authStatus = authed.status;
    row.authKeyPaths = [...keyPaths(authed.body)].sort();
    row.identicalAfterStrippingVolatile =
      JSON.stringify(stripVolatile(anon.body)) === JSON.stringify(stripVolatile(authed.body));
    row.keysOnlyWithAuth = row.authKeyPaths.filter((k) => !row.anonKeyPaths.includes(k));
    row.keysOnlyWithoutAuth = row.anonKeyPaths.filter((k) => !row.authKeyPaths.includes(k));
  }
  results.push(row);
  const verdict = TOKEN
    ? row.identicalAfterStrippingVolatile
      ? "IDENTICAL"
      : `DIFFERS: +${row.keysOnlyWithAuth.length} auth-only keys`
    : "anon only (no INDEXER_TOKEN)";
  say(`${String(row.anonStatus).padEnd(4)} ${ep.name.padEnd(26)} ${verdict}`);
}

const fixture = {
  recordedAgainst: BASE,
  recordedAt: new Date().toISOString(),
  tokenPresent: Boolean(TOKEN),
  results,
};
const { writeFileSync } = await import("node:fs");
writeFileSync(OUT, `${JSON.stringify(fixture, null, 2)}\n`);
say(`\nwrote ${OUT}`);
