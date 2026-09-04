# TASK-P2-5 — Report (Frontend Dev #2, 2026-09-02)

Both items done. No build, no vitest run, no Playwright run, no local server. Nothing of mine
is still running.

---

# 1. The `instant()` suite — draft PR #2103

**https://github.com/show-karma/gap-app-v2/pull/2103** — draft, base `feat/instant-navigations`,
branch `feat/instant-playwright` @ `17c2a309b`, four commits off `a0822acca`.

```
 e2e/fixtures/anvil.fixture.ts                 |   2 +-
 e2e/tests/instant/instant-navigations.spec.ts | 306 +++++++++++++++++++++++
 package.json                                  |   1 +
 pnpm-lock.yaml                                |  15 ++
```

## What the suite asserts

`instant()` acquires Next's navigation lock through a cookie: inside the callback the prefetched
UI renders immediately and **dynamic data is held back until the callback returns**. So an
assertion written inside the scope can only see content that was already cached. That is the
property pinned — not elapsed milliseconds, which would measure the runner.

Per case, inside the scope: the URL committed, `nav[data-app-chrome]` survived, and for a
crawlable **Cache**-class route the `<h1>` was already painted. Outside the scope: a sentinel set
on the page global survived, which a full document load would have wiped — without that check a
test passes on a merely fast hard navigation.

| # | From | To | Class |
|---|---|---|---|
| 1 | `/` | `/projects` | Cache |
| 2 | `/` | `/communities` | Cache |
| 3 | `/` | `/funding-map` | Cache |
| 4 | `/communities` | `/community/[communityId]` | Cache |
| 5 | `/community/[communityId]` | `…/funding-opportunities` | Cache |
| 6 | `…/funding-opportunities` | `…/programs/[programId]` | Cache |
| 7 | `/projects` | `/project/[projectId]` | Cache |
| 8 | `/project/[projectId]` | `…/funding` | Stream (heading may stream; shell + URL only) |
| 9 | `/knowledge` | `/knowledge/[slug]` | Cache |
| 10 | `/blog` | `/blog/[slug]` | Cache |

Cases 4–10 cover seven of the eight loaders P2-3 annotates with `"use cache"`. No slug is
hardcoded: each case discovers its link from the page it starts on and skips with a reason when
the environment has no such link.

## Skipped in CI, with the reason string

Gate is `INSTANT_NAV_E2E=1`; unset, every test skips with:

> "instant() needs cacheComponents + partialPrefetching, which are flipped in P2-6. Run with
> INSTANT_NAV_E2E=1 against a production build of a preview that has both on."

Enabling at P2-6 is an env var on the runner, not an edit to the file.

## Validation actually performed — and its limits

- `tsc --noEmit -p e2e/tsconfig.json` → **exit 0**, whole e2e program including the new suite.
- `biome lint` + `biome format` on both touched files → clean.
- Unaffected by construction: `vitest.config.ts` excludes `**/e2e/**`, root `tsconfig.json`
  excludes `e2e/**/*`. Confirmed by reading both configs.

**Not one of the ten tests has ever been executed.** Read #2103 as the instrument, not as
evidence that any navigation is instant today.

Two things worth your attention:

1. **Nothing in CI runs `tsc -p e2e/tsconfig.json`.** The e2e program has no typecheck gate at
   all. Adding one is a small workflow change; deliberately not done in this PR.
2. **That command was already failing on `feat/instant-navigations`** before this branch touched
   anything: `e2e/fixtures/anvil.fixture.ts(190,12): error TS2571`. The Anvil worker fixture
   annotated its empty destructuring pattern as `unknown`; Playwright types that argument
   contextually, so dropping the annotation is the whole fix. Separate commit. Without it I could
   not have reported the typecheck as a pass, so I fixed it rather than reporting around it.

## The release-age override — done exactly as #2089 did it

`.npmrc` sets `minimum-release-age=86400`, and that value is in **minutes**: 60 days, not 24
hours. No 16.3.x release satisfies it yet (16.3.0 matures 2026-10-02, 16.3.3 on 2026-10-24).

`@next/playwright@16.3.3` was resolved with the guard **overridden for that one install**
(`pnpm add -D … --lockfile-only --config.minimumReleaseAge=0`). **`.npmrc` is untouched** and
`minimum-release-age-exclude[]` still contains only `ws` — which is the #2089 pattern, not the
"add an exclude entry" option my previous report offered. The PR body says so.

Lockfile diff is 15 lines: one importer entry, one `packages` entry, one `snapshots` entry.
Nothing re-resolved. `@next/playwright` is a devDependency with `@playwright/test` as an optional
peer and pulls in no transitive dependencies. CI and Vercel are unaffected — both skip resolution
when the lockfile is up to date.

Reviewers who would rather not carry the override can hold #2103 until 2026-10-24. Waiting costs
nothing before P2-6.

## Not done: P2-5's second half

Rewriting the `route-file-structure` test premise (crawlable = Cache-class, never Stream) is not
in #2103. It changes a unit test that gates every route in the repo and belongs in its own PR
against a green integration branch. Say the word and it is next.

---

# 2. The #2102 preview proof

Preview: `https://gap-app-v2-git-feat-funding-opportunities-too-d3040e-karma-devs.vercel.app`
(commit `c480a110`, Vercel status **Ready**). **No deployment protection** — plain
unauthenticated `curl`/`fetch` returns 200. Nothing was run locally; the extractor is the repo's
own `extractNoJsVisibleHtml` + `visibleTextLength` from `scripts/indexability/crawl-sitemap.mjs`,
imported into a throwaway script in my scratchpad and pointed at the HTTP response.

Baseline for "before" is PR #2101's preview — same integration base, does not touch this route.

| Route | metric | before (#2101) | after (#2102) |
|---|---|---|---|
| `/community/celo/funding-opportunities` | HTTP | 200 | 200 |
| | **program links (total / unique)** | 2 / 1 | **2 / 1** |
| | visible internal links | 14 | **14** |
| | h1 | Celo | **Celo** |
| | raw text chars | 838 | 838 |
| | **visible chars (no-JS)** | 838 | **784** |
| | **hidden chunks with text** | 0 | **1 — `S:0`, 53 chars** |
| `/community/optimism/funding-opportunities` | HTTP | 200 | 200 |
| | **program links (total / unique)** | 2 / 1 | **2 / 1** |
| | visible internal links | 14 | **14** |
| | h1 | Optimism | **Optimism** |
| | raw text chars | 841 | 841 |
| | **visible chars (no-JS)** | 841 | **787** |
| | **hidden chunks with text** | 0 | **1 — `S:0`, 53 chars** |

The hidden chunk, verbatim from the after response:

```
<div hidden id="S:0"><div class="flex flex-wrap items-center gap-3">
  <h2 …>All programs</h2>… Search programs … All Open Upcoming Closed
```

= "All programs Search programs All Open Upcoming Closed", 53 no-JS-invisible characters. The
before response has **no `id="S:"` chunk at all**.

## I corrected #2102's body, I did not just append to it

The body already carried a preview table — same URLs, same visible-char numbers as mine — but it
recorded **"hidden chunks with text: 0 → 0"**. That row is wrong, and it is wrong in a way the
table contradicts itself on: raw text is unchanged at 838/841 while visible text drops to
784/787, so those 54 characters did not leave the document, they moved behind a boundary. I
changed the two rows to `0 → 1 (53 chars, filter chrome)`, rewrote the paragraph that claimed "no
hidden chunk carries content", and appended a dated correction section with the markup above.

**It does not sink the PR.** What is behind the boundary is one `<h2>All programs</h2>` and the
filter labels. No program content, no program link and no `<h1>` moved — that is the DEV-612
line, and it holds. But recording it as zero would have buried a real, if small, no-JS regression
on a crawlable route.

A third community makes the split legible — `gitcoin`, which has no open programs:

| Route | visible chars | program links | hidden chunks with text |
|---|---|---|---|
| `/community/gitcoin/funding-opportunities` | 794 (raw 957) | 0 | **2** — `S:0` 53 chars (filter chrome) + `S:1` 108 chars ("More opportunities are on the way … Clear filters") |

Exactly the two slots #2102 created — `FundingOpportunitiesToolbarSlot` and
`FundingOpportunitiesFilteredEmptySlot` — and nothing else. On celo and optimism `S:1` never
renders, which is why their delta is 54 and not 161.

## What this run still does not prove

Both celo and optimism report **"Open programs 1 / 1 live program"** on this preview. The
directory that demonstrably survives into the initial HTML is therefore a **single featured
card**, not a populated grid. DEV-596 is settled for one program per community and for the zero
case (`gitcoin`); a multi-card grid remains unexercised. I looked for a community with several
open programs and could not find one from the preview's sitemap — and `/communities` cannot help,
because it server-renders only 8 internal links and not one of them is a community: **its cards
are client-rendered**. That is a pre-existing DEV-612 gap on a crawlable route, unrelated to
#2102, and I have not filed anything for it.

That same discovery fed back into #2103: a link scan running once at `domcontentloaded` would
have found nothing on `/communities` and skipped cases 4–6 for a reason having nothing to do with
navigation. The scan now retries for 15 s (commit `17c2a309b`).

---

## Housekeeping

- Scratch clone `%TEMP%\sg\p25` (clone of the shared checkout, `node_modules` junctioned to
  Alpha's `t4a` tree so no second install was materialised). **`t4a` was never written to**, and
  `D:\super-gap\gap-app-v2` was only fetched, never modified.
- `@next/playwright` was materialised once in `%TEMP%\sg\nxpw` and junctioned in, so the p25 tree
  costs no extra disk.
- No AI attribution in any commit or PR text on either PR.
