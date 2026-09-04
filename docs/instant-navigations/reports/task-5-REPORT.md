# TASK5 — Report (Frontend Dev #2)

Branch: `feat/shell-prerender-fixes`, one commit, rebased onto `feat/instant-navigations`
@ `35a488ef0` (which now contains both #2094 and #2093).
Clone: `%TEMP%\sg-next163`. Flags stay OFF in the PR.

## Headline

**Failing routes in the readiness build: 161 → 82. The App Shell now produces no errors of
its own** — the root route `/t/[tenant]` has dropped out of the error set entirely.

| Cause | Before | After |
|---|---|---|
| `new Date()` (unstable value) | 81 | **0** |
| `usePathname()` outside `<Suspense>` | 80 | 80 |
| uncached/runtime data outside `<Suspense>` | 69 | 69 |
| **distinct routes failing** | **161** | **82** |

Both measurements use the identical two-pass method from TASK4B, on a throwaway that was
reverted: `cacheComponents: true` → collect the segment-config compile errors → strip exactly
those lines → rebuild with `experimental.prerenderEarlyExit: false` for the full list.

## (1) Footer copyright year — fixed, and it is the whole 81

`src/components/footer/copyright-year.ts` (new) holds `COPYRIGHT_YEAR`, evaluated once at
module scope. `src/components/layout/tenant-chrome.tsx` (a server component) reads it and
threads it down: `TenantFooter` → `FooterSwitcher` → `Footer`, which now takes
`copyrightYear: number` instead of calling `new Date()`.

Two decisions worth recording:

- **Module scope, not render.** `new Date()` during render is an unstable value under
  `cacheComponents`. Module scope runs when the server bundle loads, outside the prerender
  pass, so by render time it is a plain constant.
- **`import "server-only"` is load-bearing, not decoration.** If this module were ever pulled
  into a client bundle the browser would evaluate it at hydration and produce the *current*
  year against a shell holding the *build* year — a hydration mismatch every January. Passing
  the value as a prop is what keeps the client components from ever computing it.

The documented trade-off: between January 1st and the next deploy the footer shows the
previous year. That is the ordinary staleness of a copyright line and any deploy corrects it.
If that is not acceptable, the alternative is a `'use cache'` server function with a daily
`cacheLife`. Correction to what I said in the PR body: that is *not* blocked by the flags —
`experimental.useCache` still exists in 16.3.3 (deprecated in favour of `cacheComponents`, but
functional) and enables `"use cache"` on its own. I left the constant as-is because it is
simpler and needs no flag at all, but the option is open. This also unblocks P2-2, which is
specified in terms of `"use cache"` — see TASK-P2-2.

The old "should handle year transition correctly" test used fake timers to prove the footer
followed the clock. That semantic is exactly what we removed, so it is now a regression test
for the opposite: with the system clock set to 2025 and the year prop set to 2031, the footer
must render 2031. If someone reintroduces `new Date()` there, it fails.

## (2) `DeferredLayoutComponents` — fixed, but it was not costing us routes

The `usePathname()` read (the ask-karma gate on the chat bubble) is now in its own
`AgentChatBubbleSlot` leaf behind `<Suspense fallback={null}>`. The rest of the cluster stays
outside the boundary. Everything in it is `next/dynamic` with `ssr: false`, so the boundary
hides nothing from a crawler — DEV-612 does not apply, as you said.

**Honest measurement: this did not move the count.** The `usePathname` cause is 80 routes
before and 80 after. I chased the remaining 80 and they are all *page-level*, not shell:
every stack bottoms out in page code (e.g. `hooks/useContractOwner.ts:126`) with the provider
chain — `PrivyProviderWrapper` → `whitelabel-context` → `privy-bridge-context` — only as the
wrapping frames above it.

Why the shell read was not already erroring: `WhitelabelProvider` and `PrivyProviderWrapper`
unwrap the whitelabel promise with `use()` (that is #2090's design), and a suspending `use()`
above the read means the read is not "outside Suspense". So the fix is currently redundant —
but it is cheap, documented, and stops being redundant the moment Phase 2 removes that
suspension, at which point an unguarded URL read in the shell would block every route at once.
I kept it; say the word if you would rather it came out.

## (3) Public `/t/*` — branded 404

The proxy rewrites a blocked `/t/*` request to a path nothing can match;
`app/global-not-found.tsx` (below) answers it with the branded page and a real 404. Still a
rewrite, so no `Location` header and the browser URL is untouched; still
`X-Robots-Tag: noindex, follow`.

**Two findings from getting there, and the second is why this needed TASK5-B:**

1. My first attempt rewrote to an unmatchable path and got Next's *unbranded* built-in 404 —
   an unmatched URL is answered by the **root** not-found boundary, and there is no root-level
   `app/not-found.tsx` any more.
2. So I tried a real route that throws `notFound()`. That also produced the built-in 404:
   measured against a production build, **`app/t/[tenant]/not-found.tsx` does not catch a
   `notFound()` thrown by a page one level below it.** A boundary colocated in the segment *is*
   caught — that is how `app/t/[tenant]/blog/[slug]/not-found.tsx` behaves.

Both attempts pointed at the same root cause, which TASK5-B fixes properly. The sentinel route
is gone again; the rewrite target is an unmatchable path once more, and the global 404 handles
it like any other.

### TASK5-B — the unbranded-404 regression, now fixed in the same PR

Before 4A, `app/not-found.tsx` sat at the root and every unmatched URL rendered the branded
page. After the move three cases fell through to Next's unbranded
`404: This page could not be found.`

`app/global-not-found.tsx` answers all three with one page. It renders *instead of* the root
layout, so it owns its `<html>`/`<body>` and font wiring; it pulls in no navbar, footer or
providers, because those need tenant context this route has none of, and in-app 404s
(`/blog/<missing>`) already render without chrome.

**The flag you asked me to check: `experimental.globalNotFound` is still required in 16.3.3
and still defaults to `false`** (`config-shared.d.ts:1086`, default at `:1805`). Without it the
file is silently ignored. That one line is the only `next.config.ts` change, and it is not a
Cache Components flag. A test asserts the file exists, owns `<html>`/`<body>`, and that the flag
is set — because the file is inert without it and nothing else would catch that.

Verified on a production server, **both hosts**, all six paths:

| Path | Before | After |
|---|---|---|
| `/does-not-exist-xyz` | built-in 404 | **branded, 404** |
| `/t/nope/about` (unknown tenant, thrown by the root layout) | built-in 404 | **branded, 404** |
| `/t`, `/t/karma/about`, `/t/app.opgrants.io/programs/1`, `/T/karma/about` | bodyless 404 | **branded, 404** |

Zero occurrences of Next's built-in copy in any response. `/`, `/about`, `/knowledge`, `/blog`
and `/community/optimism/funding-opportunities` still 200.

**This also let me delete the sentinel route** I had built for item 3. With one global 404 the
blocked-`/t/*` rewrite can just target a path nothing matches, so
`app/t/[tenant]/blocked-internal-path/` (a page plus a colocated not-found) is gone. That is a
net simplification, and it removed a real problem: the sentinel was a new route with no
`loading.tsx`/`error.tsx`, which tripped the `route-file-structure` ratchet — and that ratchet
explicitly says not to add new routes to its legacy allowlists. Kept to the app root plus my
existing files, as you asked, so it stays clear of Alpha's P2-1 restructure.

## Gates

| Gate | Result |
|---|---|
| `tsc --noEmit` | clean |
| `biome lint` (9 touched files) | clean |
| `next build`, flags off | clean, exit 0 |
| No-JS parity `/`, `/about`, `/knowledge` | **exact: 2615 / 2082 / 7162**, h1 present |
| Branded 404 on `/t/*`, both hosts | 404 + real page (above) |
| Footer year in prerendered HTML | `© 2026 Karma. All rights reserved.` |
| Readiness: shell errors of its own | **none** — `/t/[tenant]` not in the error set |
| Readiness: failing routes | **161 → 82** |
| Full unit suite | 15963 / 15965 — the two known non-regressions |

New/changed tests: the `tenantNotFoundPathname` builder plus two invariants (the sentinel is
a real route that throws `notFound()`; the tenant tree keeps a not-found boundary); the `/t/*`
proxy tests now assert the rewrite target, including that the tenant comes from the **host**
and not from the attacker-supplied path, so the 404 always renders the requesting tenant's own
shell; the footer year regression test described above.
