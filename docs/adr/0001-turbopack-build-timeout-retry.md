# 1. Guard Turbopack production builds with a self-timeout and clean-cache retry

Date: 2026-05-25

## Status

Accepted

## Context

Vercel deployments for `gap-app-v2` intermittently hung for ~45 minutes and
then failed, with no error in the logs — the build appeared to "take 45
minutes to realise it won't build". Investigation of the Vercel deployment
history established what was actually happening:

- The failed build (`dpl_Co68avDfBW7Rj178k56kUvizdPaP`) ran for **45.4 min**
  and its log went **silent immediately after `Creating an optimized
  production build …` (Turbopack)** — no compile error, just a stall.
- The ~45-minute figure is **Vercel's hard max-build-duration killing a hung
  process**, not the build detecting a problem. There was never an error to
  surface; there was an infinite stall that got force-killed.
- The hang was **non-deterministic**. Three builds on branch
  `feat/oauth-mcp-consent-ui` hung in a ~1-hour window. Critically, commit
  `664e3d7b` hung for 45 min (`dpl_Hc5WSKP8…`) and then, **redeployed ~18h
  later with zero code changes, built in ~5 min and succeeded**
  (`dpl_DxH3GaSw…`). Identical input, different outcome — which rules out a
  code-level bug, a specific page, or a bad commit.
- Builds use `next build --turbopack`. Turbopack's **production** compiler is
  beta and has a documented history of intermittent silent hangs. The failed
  builds ran on **Next 15.4.10**; the project has since moved to 15.5.16 and
  the issue largely subsided — but production builds still use `--turbopack`,
  so the risk remained armed.

Two configuration smells made a hang worse than necessary:

- `staticPageGenerationTimeout: 10000` (≈2.77 hours). The app has **no
  `generateStaticParams`** and builds in ~5 min, so nothing approaches this.
  It could not save a build inside Vercel's 45-min window — purely vestigial.
- No upper bound on build duration below Vercel's 45-min platform ceiling.

Because the root cause is non-deterministic instability in an upstream beta
compiler, **it cannot be deterministically fixed from this repo.** The real
choice is how to contain it.

## Decision

Keep `next build --turbopack` (preserves build speed and parity with
`next dev --turbopack`), and **contain** the hang rather than eliminate it:

1. **Self-timeout + clean-cache auto-retry**, applied only on Vercel via
   `vercel.json` `buildCommand` (Vercel's Linux builders have GNU coreutils
   `timeout`; the shared `package.json` `build` script stays cross-platform so
   local builds on Windows/macOS are unaffected):

   ```
   timeout -k 30s 900s pnpm build || ( rm -rf .next && timeout -k 30s 900s pnpm build )
   ```

   A hung build is killed at **15 min**, then rebuilt once on a **clean
   `.next`** — which both leverages the observed "retry succeeds" behaviour and
   clears a possibly-poisoned Turbopack cache (a leading hang suspect).

2. **Lower `staticPageGenerationTimeout` from `10000` to `120`** in
   `next.config.ts`, so a hung build-time fetch fails fast and names the page
   instead of stalling silently.

We explicitly did **not** switch the production build to the stable webpack
compiler (which would eliminate the Turbopack-hang class entirely), to keep
build speed and dev/build parity.

## Consequences

- A hang now costs at most ~30 min (15-min kill + clean cold rebuild) instead
  of 45 min, and usually **self-heals with no human in the loop** — best case
  ~23 min (15-min fail + ~8-min cold rebuild), worst case two 15-min fails →
  hard failure surfaced fast. All paths stay under Vercel's 45-min ceiling.
- The retry path does a **cold** rebuild (cache wiped), so it is slower than a
  normal ~5-min build. If cold rebuilds ever approach 15 min, raise the second
  attempt's budget (e.g. `1200s`); total still fits under 45 min.
- Local `pnpm build` is unchanged on all platforms — the guard is Vercel-only.
- This is **containment, not a cure.** The underlying Turbopack instability
  lives upstream. Revisit if hangs recur on current Next: either bump Next
  again or reconsider switching the production build to webpack. When Turbopack
  `build` reaches GA and is stable, the timeout/retry wrapper can be removed.
- `staticPageGenerationTimeout: 120` assumes no page legitimately needs >2 min
  of build-time generation. True today (no `generateStaticParams`); if a future
  page does heavy build-time fetching, fix the fetch rather than re-inflating
  this value.

## Evidence

| Deployment | Commit | Duration | Result |
|---|---|---|---|
| `dpl_ERwy6Hu…` | `af40d6c6` | 45.6 min | ERROR (silent hang) |
| `dpl_Co68avD…` | `00fb74c5` | 45.4 min | ERROR (silent hang) |
| `dpl_Hc5WSKP8…` | `664e3d7b` | 45.2 min | ERROR (silent hang) |
| `dpl_DxH3GaSw…` | `664e3d7b` (redeploy) | ~5.1 min | **READY** |
