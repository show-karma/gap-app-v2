/**
 * Response headers for the notebook bundle route.
 *
 * These are not invented here. They mirror, byte for byte, the policy the
 * karma-notebooks CI verified the bundle against — captured in that pipeline's
 * `reports/ws4-hosting-contract.json` and re-checked on every publish by
 * `scripts/opaque_origin_preflight.py`. Serving anything looser than the
 * verified policy would mean Tester validates a configuration CI never
 * exercised; serving anything stricter breaks the notebook. Both directions
 * are asserted in `__tests__/utilities/notebook-csp.test.ts` against the
 * contract file itself.
 *
 * Provenance of the current values: karma-notebooks `cbc482b`, workflow run
 * 33226521076, artifact `karma-notebooks-static`
 * (sha256 b956feeb751133aafd7eb579934ba1b0ec07fd23da760baeeeff080b511edaae).
 *
 * No path aliases or app imports here — next.config.ts loads this before the
 * alias resolver exists.
 */

import contract from "./hosting-contract.json";

/** Route the published bundles are served from. */
export const NOTEBOOK_ASSET_PATH_PREFIX = "/notebooks";

/** Source expression matching every path under the bundle route. */
export const NOTEBOOK_ASSET_SOURCE = `${NOTEBOOK_ASSET_PATH_PREFIX}/:path*`;

/**
 * Same-origin path of a published bundle's entry document.
 *
 * Derived from (community, slug) rather than read from the config's
 * `artifactUrl`, because under same-origin hosting the bundle lives inside
 * this app's own deployment: its URL is whatever origin the app is served
 * from, which a stored absolute URL cannot know — every preview deployment has
 * a different one. `artifactUrl` stays in the API response as provenance (it
 * records where CI published the bundle); `artifactVersion` is what a reader
 * and a rollback check actually need, and that is what the viewer displays.
 *
 * Both segments are encoded: they arrive from route params, and a crafted
 * value must not be able to climb out of the prefix the CSP is scoped to.
 */
export function notebookAssetPath(communityId: string, slug: string): string {
  return `${NOTEBOOK_ASSET_PATH_PREFIX}/${encodeURIComponent(communityId)}/${encodeURIComponent(slug)}/index.html`;
}

/**
 * The external origins the notebook may call, and nothing else.
 *
 * Sourced from the bundle's own contract, NOT from this app's
 * `NEXT_PUBLIC_GAP_INDEXER_URL`. The API base URL is baked into the bundle at
 * export time, so it is a property of the artifact, not of the deployment
 * hosting it — reading the app's env instead would emit a policy that happens
 * to match in production and silently blocks every data fetch on a preview
 * pointed at a different indexer. That is exactly the failure this function
 * exists to prevent, and it is why the emitted CSP does not vary by
 * environment: it is the same policy CI verified, everywhere.
 *
 * When the notebook is rebuilt against a different API, the contract changes
 * with the bundle and this follows it.
 */
export function notebookConnectOrigins(): readonly string[] {
  return contract.externalConnectOrigins;
}

/**
 * SHA-256 hashes of the bundle's inline bootstrap scripts.
 *
 * Hashes rather than `'unsafe-inline'`: the export contains exactly four inline
 * scripts, so naming them costs nothing and keeps an injected fifth from
 * running. These are emitted by the karma-notebooks build and must be updated
 * together with the bundle — a stale hash blocks the bootstrap outright, which
 * is the correct failure mode (visible, immediate) rather than a silent
 * loosening.
 */
export const NOTEBOOK_INLINE_SCRIPT_HASHES: readonly string[] = contract.inlineScriptHashes;

/**
 * CSP for the notebook bundle route.
 *
 * `default-src 'none'` is the base: everything the bundle may load is then
 * named explicitly. `connect-src` is the load-bearing directive — it is what
 * stops a script inside the frame from fetching and executing arbitrary code
 * (Python wheels in particular) on this app's own origin, which is why
 * vendoring the runtime was a deployment gate rather than an optimisation.
 *
 * `wasm-unsafe-eval` permits WebAssembly compilation only, not `eval` of
 * JavaScript. `worker-src blob:` is required because Pyodide runs in a worker
 * created from a blob URL.
 */
export function notebookCsp(): string {
  return [
    "default-src 'none'",
    `script-src 'self' 'wasm-unsafe-eval' ${NOTEBOOK_INLINE_SCRIPT_HASHES.join(" ")}`,
    "worker-src blob:",
    `connect-src 'self' ${notebookConnectOrigins().join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");
}

/**
 * Sub-directories of a published bundle whose filenames change whenever their
 * contents do, so a cached copy can never be stale:
 *
 * - `assets/` — 726 files, every one content-hashed by the bundler
 *   (`_baseSet-DehVzRp6.js`).
 * - `pyodide/` — the runtime and 15 wheels, each carrying its version in the
 *   filename (`plotly-6.9.0-…whl`); the notebook's own data module carries a
 *   content hash in its local version segment
 *   (`grants_data-0.0.0+marimo.b01648caea69-…whl`).
 *
 * Everything else in a bundle — `index.html`, the favicons, `manifest.json`,
 * `storage-shim.js`, `nb-interactive.js` — keeps a revalidating policy, because
 * those names are stable across republishes. `index.html` in particular MUST
 * revalidate: it is what points at the hashed assets, so caching it would pin a
 * reader to an old bundle indefinitely.
 *
 * ⚠️ Four files under `pyodide/` are NOT version-named — `pyodide.asm.wasm`,
 * `pyodide.asm.mjs`, `pyodide-lock.json` and `python_stdlib.zip`. They are
 * immutable for as long as the Pyodide version does not change, which is true
 * of every republish of the SAME runtime. A Pyodide upgrade republished to this
 * same path would serve those four stale to anyone who cached them. The fix is
 * a version segment in the bundle path
 * (`/notebooks/<community>/<slug>/<artifactVersion>/…`), which makes the whole
 * tree immutable-safe; it belongs to the publish pipeline and should land
 * before the runtime is ever upgraded in place.
 */
export const NOTEBOOK_IMMUTABLE_DIRECTORIES = ["assets", "pyodide"] as const;

/**
 * A year, immutable. These are content-addressed paths, so the browser may
 * reuse them without asking — which is the point: a repeat visit otherwise
 * revalidates ~345 requests, including a 9.6MB wasm, and forfeits the "repeat
 * visit is fast" property the page depends on.
 */
export const NOTEBOOK_IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

/**
 * Header rules granting immutable caching to the content-addressed directories
 * of every published bundle.
 *
 * Deliberately an allowlist of directories rather than an exclusion of
 * `index.html`: a rule shaped as "everything except the entry document" would
 * silently start caching any new unversioned file a future export drops beside
 * it. Here a new directory has to be added on purpose.
 *
 * These sources must not overlap each other, and must not overlap any rule that
 * also sets Cache-Control — Next emits every matching rule's headers, so two
 * matches would send the header twice.
 */
export function notebookAssetCacheRules(): {
  source: string;
  headers: { key: string; value: string }[];
}[] {
  return NOTEBOOK_IMMUTABLE_DIRECTORIES.map((directory) => ({
    source: `${NOTEBOOK_ASSET_PATH_PREFIX}/:community/:slug/${directory}/:path*`,
    headers: [{ key: "Cache-Control", value: NOTEBOOK_IMMUTABLE_CACHE_CONTROL }],
  }));
}

/**
 * Headers for the bundle route.
 *
 * `Access-Control-Allow-Origin: *` is not optional and not a loosening. The
 * frame is sandboxed without `allow-same-origin`, so it runs on an OPAQUE
 * origin: its own subresource fetches — the vendored Pyodide runtime and the
 * wheels — are cross-origin requests carrying `Origin: null`, and without this
 * header the browser blocks them and the notebook never boots. It grants
 * nothing extra: these are public static assets, the responses carry no
 * credentials, and `Access-Control-Allow-Credentials` is deliberately absent
 * (a wildcard with credentials is rejected by every browser anyway).
 *
 * `X-Content-Type-Options: nosniff` matters more than usual here — the bundle
 * ships `.whl` and `.wasm` files, and sniffing a wheel into something
 * executable is exactly the outcome to prevent.
 */
export function notebookHeaders(): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: notebookCsp() },
    { key: "Access-Control-Allow-Origin", value: "*" },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "no-referrer" },
  ];
}
