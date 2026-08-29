/**
 * Gate for the LAZY-LIVE runtime (WS-B4).
 *
 * Architecture B serves notebook pages as server-rendered static-first HTML:
 * no Python, no WASM, no untrusted code in the browser on the default path.
 * That is the security win of B — the opaque-origin sandbox, the CSP carve-out
 * and the rendered-sandbox CI assertion are no longer load-bearing for an
 * ordinary reader, because an ordinary reader is never served live code.
 *
 * They are all still here, and still tested, for one future purpose: the
 * opt-in "explore this yourself" control that boots the validated P1 WASM
 * runtime for a single viewer who asks for it. This flag gates that control.
 *
 * It is `false` because WS-B4 has not been built. Turning it on without wiring
 * the runtime would render a control that promises interactivity the page
 * cannot deliver; turning it on WITH the runtime re-introduces live untrusted
 * code, and at that point the sandbox invariant in
 * `__tests__/app/notebook-sandbox.test.tsx` is load-bearing again and must be
 * satisfied before it ships.
 *
 * The P1 bundle stays deployed under `/notebooks/<community>/<slug>/` — it is
 * what the desktop demo points at, and what WS-B4 will boot.
 */
export const NOTEBOOK_LIVE_RUNTIME_ENABLED = false;
