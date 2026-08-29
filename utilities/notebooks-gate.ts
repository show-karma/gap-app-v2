/**
 * Deployment gate for the notebook iframe.
 *
 * The notebook bundle is served from gap-app-v2's OWN origin, so a running
 * script inside the frame is one CSP mistake away from acting on this origin.
 * Three things must be true before any build — preview included — is allowed
 * to point the frame at a real bundle:
 *
 *   1. the marimo render bug is fixed;
 *   2. the opaque-origin pre-flight is green (or the memory-backed
 *      `localStorage` shim is injected into the exported page);
 *   3. Pyodide and every wheel are VENDORED into the deployed assets, and the
 *      notebook route's `connect-src` is tightened to the GAP API only.
 *
 * Until (3) in particular, a CSP that still allows pypi.org /
 * files.pythonhosted.org / cdn.jsdelivr.net would let the frame fetch and
 * execute arbitrary Python wheels at view time on gap-app-v2's own origin —
 * the same class of compromise the iframe exists to prevent.
 *
 * While this is `false` the viewer page renders an explicit "coming soon"
 * state: the route, the data fetch and the not-found behaviour are all live
 * and testable, only the frame is withheld.
 *
 * OPENED 2026-08-29 for the validation preview. WS1 cleared all three
 * conditions at karma-notebooks `cbc482b` (workflow run 33226521076): the
 * render fix landed, the opaque-origin pre-flight is green with a
 * memory-backed `localStorage` shim, and the runtime is vendored with
 * `connect-src` verified against a CDP network capture as `'self'` plus the
 * GAP API only — no package host contacted. The bundle that ships with this
 * flip is that run's artifact, byte-for-byte.
 */
export const NOTEBOOK_EMBED_ENABLED = true;
