# TASK-P2-1 — chrome route groups (D1) + the Group S smalls

Draft PR **https://github.com/show-karma/gap-app-v2/pull/2096** → `feat/instant-navigations`
Branch `feat/chrome-route-groups` @ `ddbc35093`, off `35a488ef0`. Flags stay OFF.

## Result

`cacheComponents` readiness, measured with `experimental.prerenderEarlyExit: false` (which
finally enumerates every failing route instead of bailing at the first):

| | before `35a488ef0` | after `ddbc35093` |
|---|---:|---:|
| routes failing to prerender | 161 / 161 | 156 |
| `usePathname()` CLIENT_HOOK_DYNAMIC | 2632 | **704 (−73%)** |
| uncached-data | 552 | 552 |
| `new Date()` | 81 | 149 |

Gone from the offender list: `footer-switcher.tsx` (640), `useContractOwner.ts` (640),
`whitelabel-navbar.tsx` (560), `global-navbar-slot.tsx` (80).

`new Date()` rising is not a regression — with 1928 fewer hook errors, more routes reach the
footer before failing, so the same single defect is counted on more routes.

Only 5 routes went fully green, all in `(bare)` (4 of them Cache-class). **No `(chrome)`
route can, until TASK5 lands**: `DeferredLayoutComponents.tsx:66` (640) and
`footer.tsx:54` (149) are on every chrome route and both are TASK5's files, untouched here
by agreement. The queue already lists P2-1 as depending on TASK5 — this is that dependency
measured.

## What shipped

- Root layout: html/body/fonts/theme/providers, no chrome. `(chrome)` (149 routes) and
  `(bare)` (12) below it. `[data-app-content]` stays at the root for the embed stylesheet.
- `GlobalNavbarSlot` deleted. `TenantNavbar` renders navbar + spacer; `TenantFooter` picks
  the footer from the server-known `isWhitelabel`. `WhitelabelNavbar` loses its
  ADMIN_STUDIO check.
- Donor-research section layout moved to `src/features/donor-research/` and re-exported by
  both group layouts — its advisor routes want chrome, its token routes do not.
- `useAuth`: the post-login pathname read is now `window.location.pathname` inside the
  effect (it was never a dependency).
- `NavbarAssistantButton`: leaf Suspense.
- `getWhitelabelContext` memoised with `React.cache`.

## Gates

`tsc` clean · `next build` clean · `biome` 8 warnings, all present at the merge base.
38-route prod-server sweep across both groups and both hosts — every `(chrome)` route has
navbar+footer, every `(bare)` route has neither, whitelabel theme/navbar/canonical
unchanged. `route-file-structure` passes **with every entry in its sets unchanged** (the
ratchet is re-keyed on the public route; groups are invisible in URLs) plus a new guard for
pages landing in neither group. New `chrome-groups.test.tsx` pins both layouts.
Unit 15963/15967 — the 4 failures are load flakes or the CRLF artefact, all pass in isolation.

No-JS parity: **2615 / 2082 / 7162, byte-identical**, h1 present, 19 navbar links still in
the visible HTML.

## Three things for you

1. **One hidden chunk now exists** (the gate said 0). It is the `NavbarAssistantButton`
   Suspense boundary. I opened it: one `<button>`, 0 links, and the string "Ask Karma" that
   the extractor did not count as visible before either. Char counts and link graph are
   unchanged, so I read DEV-612 as satisfied — but the criterion as written says zero, so
   your call. Dropping that one boundary costs `navbar-assistant-button` back on the
   offender list and nothing else.
2. **Whitelabel behaviour change.** On a tenant host, `/nonprofits/find-funders` used to
   render the whitelabel navbar *and* the Find Funders navbar — `WhitelabelNavbar` only
   suppressed on ADMIN_STUDIO, and `FooterSwitcher` returned `WhitelabelFooter` before its
   find-funders check. `(bare)` is bare on every host, so the double navbar stops. I think
   it is a fix; it was not in the brief.
3. **`footer-switcher.tsx` is now unused** but lives in TASK5's directory, so I left it.
   Worth a line in TASK5. Knip does not gate CI.

## Two corrections to my own earlier reports

- **`useAgentContextSync` and `ContributorProfileDialog` were NOT changed**, against the
  brief. Both are only reachable behind `next/dynamic(..., { ssr: false })` in
  `DeferredLayoutComponents` (and `ProjectModals`), so they never server-render and never
  blocked a prerender. The readiness build confirms: neither appears in the offender list,
  before or after. My matrix listed them because the import graph follows `import()` edges
  regardless of `ssr: false` — the caveat I wrote in its §"How the numbers were produced",
  now realised. `useAgentContextSync` also could not have been fixed as described: it uses
  `useParams()` too, which trips the same bailout (`navigation.js:179`).
- **Pre-existing 404 regression from Task 4A, not from this PR.** An unmatched URL renders
  Next's built-in 404, not the app's styled one: Next resolves the global not-found from
  the **app root**, and 4A moved `app/not-found.tsx` under `app/t/[tenant]/`. So it has
  been this way since #2094 and is unchanged here. I wrote a fix, proved it was never
  reached, and reverted it. The correct fix is a catch-all `(chrome)/[...rest]/page.tsx`
  calling `notFound()` — a route-table change that deserves its own item. Say the word.
