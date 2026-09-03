# TASK-P2-4A2 + TASK-P2-5 — Report (Frontend Dev #2)

---

# TASK-P2-4A2 — the funding-opportunities toolbar split

Branch `feat/funding-opportunities-toolbar-split` @ `c480a1103`, draft **PR #2102** →
`feat/instant-navigations`. Flags off.

## The split

`useProgramFilterUrl()` owns `useSearchParams()`/`usePathname()` and returns `writeUrl`. The
body of `writeUrl` is **unchanged** — same params source, same pathname, same `router.replace`.
Moving the read was the point; changing what gets written is what broke my first attempt.

Two consumers, each behind its own leaf boundary:

- `FundingOpportunitiesToolbarSlot` — the filter toolbar, and the owner of the URL→store seeding
  effect. It lives there and nowhere else; a second copy would seed the store twice.
- `FundingOpportunitiesFilteredEmptySlot` — the clear-filters empty state, the second and last
  `writeUrl` consumer. It only renders once a filter is active, which cannot happen on the
  server.

Verified structurally — inside the boundaries: those two slots. Outside: `FeaturedProgram`,
`EditorialProgramCard`, `ProgramsEmpty`, `ProgramsError`, `ProgramsSkeleton`.

## Gates

**`funding-opportunities-hydration.test.tsx` — 3/3 green, unchanged.** This is the one that
matters: it mocks the server data, asserts the hydrated cache is used without a second fetch,
and its two interaction tests (tab click, search box) are exactly what caught the first attempt
in #2101. `tsc` clean, `biome` clean.

**No-JS, production build, before vs after:**

| Route | visible chars | links | h1 | hidden chunks w/ text |
|---|---|---|---|---|
| `/community/optimism/funding-opportunities` | 936 → **773** | 20 → **20** | unchanged | 0 → **0** |
| `/community/celo/funding-opportunities` | 793 → **630** | 20 → **20** | unchanged | 0 → **0** |
| `/` | 2615 → **2615** | 35 → **35** | unchanged | 0 → **0** |
| `/about` | 2082 → **2082** | 19 → **19** | unchanged | 0 → **0** |

I diffed the visible text to see exactly which 163 characters left:

```
All programs / Search programs / All / Open / Upcoming / Closed
More opportunities are on the way / Try other filters... / Clear filters
```

All filter chrome and the empty-filter state. No program content; link count identical.

## The limitation, stated plainly

**That no-JS run does not prove a populated directory survives**, because in my environment it
was never in the HTML to begin with: **zero `/programs/` hrefs in the rendered output of *both*
builds**, and the page reports "Open programs 0 / Total pool — / Applicants 0". The server fetch
is not returning programs to a local build, so the page takes its documented degradation path
and renders the client empty state. I checked five communities; `celo` has 49 program links in
the RSC payload and none in the rendered HTML, before or after.

So the DEV-596 guarantee rests on the hydration unit test (which *does* mock the data and
exercise the populated path) plus the structural check. **The no-JS numbers should be re-run on
a preview where the indexer answers before this leaves draft.**

---

# TASK-P2-5 — BLOCKED, and not by anything I can fix

`@next/playwright` cannot be installed. It is not a resolution problem — it is the repo's own
supply-chain guard:

```
ERR_PNPM_NO_MATURE_MATCHING_VERSION
Version 16.3.3 (released 7 days ago) of @next/playwright
does not meet the minimumReleaseAge constraint
```

`.npmrc` sets `minimum-release-age=86400`. That value is in **minutes**, not seconds — 86400
minutes is **60 days**. That is why a 7-day-old package fails what looks like a 24-hour rule,
and it is the same guard the user already ruled on for Next 16.3.3.

Every 16.3.x release, with the date it becomes installable:

| Version | Published | Age today | Installable from |
|---|---|---|---|
| 16.3.0 | 2026-08-03 | 30d | **2026-10-02** |
| 16.3.1 | 2026-08-13 | 20d | 2026-10-12 |
| 16.3.2 | 2026-08-21 | 12d | 2026-10-20 |
| 16.3.3 (matches our Next) | 2026-08-25 | 8d | 2026-10-24 |
| 16.3.4 | 2026-08-31 | 2d | 2026-10-30 |

`2026-10-02` is exactly the date already recorded for the Next 16.3.3 maturity — same guard,
same arithmetic.

**I did not bypass it.** The only way through is adding `@next/playwright` to
`minimum-release-age-exclude[]`, which widens a supply-chain control; the exclude list currently
contains exactly one entry (`ws`). That is the user's call, not mine — particularly given they
deliberately gated 16.3.3 on this same rule.

I removed the `feat/instant-playwright` branch rather than leave an empty one; nothing was
committed and the failed installs left the tree clean.

## Three ways forward — your call

1. **Wait.** `@next/playwright@16.3.0` matures 2026-10-02, the version matching our Next on
   2026-10-24. P2-6 is not imminent, so this may simply be fine.
2. **Add the exclude entry.** One line in `.npmrc`. Fastest, but it is a deliberate weakening of
   a control the user chose, and it should be their decision on the record.
3. **Write the suite with plain `@playwright/test`** (already installed, 1.58.2) instead of
   `instant()`: intercept the RSC request, click, and assert the target content is visible
   *before* that request resolves. That is the same property `instant()` checks, expressed
   directly, and it is installable today. It would need rewriting to `instant()` later if you
   want the official helper.

I did not pick one, because option 2 changes a security setting and option 3 deviates from the
API you specified. Say which and I will do it immediately — the 10 navigations are already
enumerated in the brief and the work itself is short.
