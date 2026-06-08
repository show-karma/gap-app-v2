# Canonical-leak repro / verification harness

## The bug

Under concurrent SSR load, a `<link rel="canonical">` rendered for one request
can leak the slug of a *different* project/community being rendered at the same
moment on the same warm server instance (cross-request state bleed). Googlebot
then sees the wrong canonical and mis-attributes / drops the page from the
index. The leak is server-side, so it only shows up with concurrency and is
invisible to single-page manual checks. The Sentry v9 -> v10 upgrade is the
suspected fix; this harness proves it before/after.

## How to run

Pure Node 18+ (uses global `fetch`), no install, no external deps.

```bash
node scripts/repro/canonical-leak-repro.mjs https://<preview-url>
```

Or via env vars:

```bash
BASE_URL=https://<preview-url> CONCURRENCY=30 ROUNDS=4 node scripts/repro/canonical-leak-repro.mjs
```

Defaults: `BASE_URL=https://www.karmahq.xyz`, `CONCURRENCY=30`, `ROUNDS=4`.

It fires `CONCURRENCY` Googlebot requests at once per round, round-robining a
mixed list of real `/project/<slug>` (overview/about/impact) and
`/community/<slug>` (root/projects/programs) paths so project and community
renders interleave on the same instance.

## How to read the output

Per response it extracts the first canonical link, normalizes to a path
(scheme/host/trailing-slash/query stripped), and compares the entity:

- **OK** — canonical points at the same `project`/`community` slug requested
  (a shorter overview canonical for an about/impact page is still OK).
- **Mismatch (LEAK)** — canonical points at a *different* slug or kind. Up to 15
  are printed as `requested ... -> canonical ...`.
- **No canonical** — no canonical tag found (reported separately, not a leak).
- **Network errors** — fetch failures / 45s timeouts (separate, not a leak).

The summary prints totals, mismatch count + rate %, and sample mismatches.
Exit code is `1` when any mismatch is found, `0` otherwise — so it can gate a
preview check in CI.

## Before/after protocol

1. **Reproduce (v9):** deploy a Vercel preview built from the current Sentry v9
   code and run the harness against it. Expect a non-zero `Mismatches` count
   and exit `1`. Re-run a couple of times (the race is load-dependent) and bump
   `CONCURRENCY`/`ROUNDS` if needed to surface it.
2. **Confirm (v10):** deploy a preview built from the Sentry v10 upgrade branch
   and run the same command against that URL. Expect `Mismatches: 0` and exit
   `0`.

Same paths, same concurrency, only the deployment changes — a clean v9-leaks /
v10-clean delta is the proof the upgrade fixes the canonical leak.
