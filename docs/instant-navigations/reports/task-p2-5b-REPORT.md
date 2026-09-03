# TASK-P2-5B — Report (Frontend Dev #2, 2026-09-02)

Done. No build, no full suite, no Playwright, no server. One vitest invocation, one file, two
workers. Nothing of mine is still running.

Also filed, as instructed: **`.maestri/reports/finding-communities-cards-no-js.md`** — the
`/communities` no-JS gap, written up as a standalone pre-existing finding and explicitly marked
out of scope for this initiative.

---

## Draft PR #2104

**https://github.com/show-karma/gap-app-v2/pull/2104** — draft, base `feat/instant-navigations`,
branch `feat/route-structure-premise` @ `8d715c567`, one commit off `a0822acca`.
One file, `+98 / −1`. Documentation and tests only: no route, component or config changes, and
no route moves group.

## The premise, restated

The docblock claimed every route was dynamic because the root layout awaited `headers()`. That
read is gone — `utilities/whitelabel-server.ts` resolves the tenant from the `[tenant]` root
param, URL-derived, no dynamic render.

Routes are still dynamic, for a different and deliberately temporary reason:
`app/t/[tenant]/layout.tsx` exports `dynamic = "force-dynamic"`, held so that removing the host
read did not silently start prerendering several hundred pages. Its own comment says that line
is what Phase 2 deletes, segment by segment.

Why the distinction earns its place in the file: the DEV-612 hazard is unchanged **today**, but
its cause is scheduled for deletion, and when it goes an uncacheable crawlable route does not
become safe — it becomes *streamed*, which is the same hidden-chunk failure by another road.
The invariant is now written down in those terms: **crawlable means Cache-class, never Stream**,
with obligation 1 (no `loading.tsx` on the chain) tested and obligation 2 (no unguarded URL-hook
read reachable from the page/layout chain) documented.

## The URL-hook-module check: measured, then rejected

I built the check before deciding it was too brittle, because "brittle" should be a measurement
and not a hunch. The probe walks each crawlable route's `page.tsx` + `layout.tsx` chain, resolves
`@/…` and relative specifiers, and flags any import of a module calling `useSearchParams()` or
`usePathname()` (77 such modules in the repo).

**Result: 53 of 53 crawlable routes flagged.** Transitive walk at depth 6: also 53 of 53.

Nearly all of them through one module — the root layout renders
`components/DeferredLayoutComponents.tsx`, which calls `usePathname()` at the top of a client
component whose every heavy child is a `dynamic(..., { ssr: false })` import. That is precisely
the shape the rule is meant to permit, and it is the whole argument in one example: whether a
boundary sits between the crawlable content and the URL read is a question about JSX structure at
render time, not about imports. No import-graph check answers it. A ratchet firing on 100% of its
subjects on day one is an allowlist factory — and the allowlist would need touching on every
route addition, which teaches people to silence it.

So I took your stated fallback: rule stays as documentation (with the measurement recorded in the
comment so nobody re-litigates it from scratch), the existing `loading.tsx` ratchet stays, and
the enforcement of obligation 2 is named as what actually does it —
`scripts/crawl-sitemap.mjs --visibility-mode no-js`, which measures rendered HTML.

## What is now tested: chrome group membership

```
49 crawlable routes must be in (chrome)
 4 exceptions in (bare): nonprofits/find-funders{,/connect,/connect/chatgpt,/connect/claude}
```

`SITEMAP_BARE_ROUTES` holds only the exceptions rather than a full route→group map, so there is
one short list to maintain instead of a second copy of all 53 route strings drifting against the
first. Two tests, failing in both directions: a route leaving `(chrome)` fails by name; an entry
whose route stops being crawlable fails as stale.

The gap this closes: which shell a route gets is decided by its route group, and for a crawlable
page that shell **is** its internal link graph in the no-JS HTML. A crawlable route moved from
`(chrome)` to `(bare)` loses navbar and footer, and nothing in this file would have noticed.

## Validation

- `vitest run --pool=forks --maxWorkers=2 __tests__/app/route-file-structure.test.ts` →
  **10 passed** (8 existing + 2 new), 2.84 s. That one file only.
  **Flag note:** vitest 4.1.0 rejects `--poolOptions.forks.maxForks` (`CACError: Unknown option`)
  and `--minWorkers`; `--maxWorkers=2` with `--pool=forks` is the current spelling of the same
  cap. Worth updating the standing instruction, since the literal command in the resource rule
  now fails on this repo.
- **Mutation-checked.** A structural test that cannot fail is decoration: adding `"about"` (a
  `(chrome)` route) to `SITEMAP_BARE_ROUTES` fails with
  `about: expected (bare), found (chrome) — …`, 1 failed / 9 passed. Reverted; final state
  re-run green.
- `biome lint` on the touched file — clean. `biome format` fails on it **and on files this branch
  never touched** (working tree CRLF, blobs LF); CI checks out LF and is unaffected. The file's
  CRLF blob was preserved byte-for-byte — 476 CRLF, zero lone LF.

## One thing I did not do

I did not add a `tsc -p e2e/tsconfig.json` CI gate, and I did not touch `force-dynamic`. Both
were out of this task's scope; the first is still worth doing and is noted in #2103.
