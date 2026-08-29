/**
 * Content-Security-Policy for the notebook bundle route.
 *
 * The bundle is served from gap-app-v2's own origin, so this policy is the
 * second of the two guardrails that make same-origin hosting tenable (the
 * first is `sandbox="allow-scripts"` with no `allow-same-origin`). Its job is
 * narrow and specific: a script running inside the frame must be unable to
 * reach anything except the GAP API.
 *
 * `connect-src` is the load-bearing directive. Allowing pypi.org,
 * files.pythonhosted.org or cdn.jsdelivr.net here would let the frame fetch
 * and execute arbitrary Python wheels at view time, on this origin — the exact
 * class of compromise the iframe exists to prevent. Pyodide and every wheel
 * must be vendored into the deployed assets and loaded from `'self'`; that
 * vendoring is a deployment gate, not an optimisation.
 *
 * `wasm-unsafe-eval` is required: Pyodide compiles WebAssembly. It permits
 * WebAssembly compilation only — not `eval` of JavaScript.
 *
 * No path aliases or app imports here — next.config.ts loads this before the
 * alias resolver exists.
 */

/** Route the published bundles are served from. */
export const NOTEBOOK_ASSET_PATH_PREFIX = "/notebooks";

/** Source expression matching every path under the bundle route. */
export const NOTEBOOK_ASSET_SOURCE = `${NOTEBOOK_ASSET_PATH_PREFIX}/:path*`;

/**
 * The GAP API origin the notebooks may call, and nothing else.
 *
 * Read from the environment so preview builds talk to the staging indexer, but
 * defaulted rather than left blank: an empty value would emit a `connect-src`
 * naming only `'self'`, which fails closed (the notebook shows its own error
 * state) instead of failing open.
 */
export function gapApiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_GAP_INDEXER_URL;
  if (!raw) return "https://gapapi.karmahq.xyz";
  try {
    return new URL(raw).origin;
  } catch {
    return "https://gapapi.karmahq.xyz";
  }
}

/**
 * CSP for the notebook bundle route.
 *
 * `frame-ancestors 'self'` keeps the bundle framable only by this app — a
 * third-party site cannot embed a notebook and pass it off as its own.
 */
export function notebookCsp(): string {
  return [
    "default-src 'self'",
    // Pyodide needs WebAssembly compilation and inline bootstrap code; both are
    // scoped to this route and cannot reach the app's own pages.
    "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // The whole point of this policy. `'self'` covers the vendored runtime and
    // the notebook's own assets; the API origin is the only external host.
    `connect-src 'self' ${gapApiOrigin()}`,
    // Pyodide runs in a Web Worker created from a blob URL.
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    // A notebook has no business framing anything or navigating the top window.
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'self'",
  ].join("; ");
}
