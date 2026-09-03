# TASK-REBASE2 — 2101 / 2102 / 2103 rebased onto `a2ac4b958`, gates green (Frontend Dev #2, 2026-09-02)

All three rebased cleanly onto the integration head, force-pushed with a lease against their exact
old heads, and **the phantom baseline is gone: `quality-gate` passes on all three.** No build run,
no local test suite — CI did the work.

## Heads

| PR | branch | old head | **new head** | commits replayed |
|---|---|---|---|---|
| #2101 | `feat/leaf-suspense-manage-admin` | `977d53745` | **`c1da9e436`** | 1 |
| #2102 | `feat/funding-opportunities-toolbar-split` | `c480a1103` | **`126b1d0f9`** | 1 |
| #2103 | `feat/instant-playwright` | `17c2a309b` | **`1fad2fb1e`** | 4 |

Integration head used as the new base: `a2ac4b958` (`Merge PR #2099: drop the dead pathname tests
from the community hub`). All three PRs already target `feat/instant-navigations`, so that commit
is now exactly their merge base — `git merge-base` was `b785e75d3` for 2101/2102 and `a0822acca`
for 2103 before this.

**No conflicts on any of the three.** Nothing was resolved, so no commit content changed beyond the
replay; the commit subjects and bodies are unchanged and carry no AI attribution (checked before
each push).

## Gates

Your diagnosis holds — it was the inherited baseline, not the branches:

| Check | #2101 | #2102 | #2103 |
|---|---|---|---|
| `quality-gate` | **pass** | **pass** | **pass** |
| `baseline-guard` | pass | pass | pass |
| `gate-guard` | pass | pass | pass |
| `static-checks` | pass | pass | pass |
| `react-doctor` | pass | pass | pass |
| `smoke` | pass | pass | pass |
| `checklist` / `gate-check` / `report` | pass | pass | pass |
| `Vercel` | pass | pass | pass |
| `test (1..6)` | 6/6 pass | 5/6 pass, shard 5 running | 5/6 pass, shard 6 running |

`build`, `claude`, the `dogfood-*` jobs, `qa-*`, `review-gate` and `verdict` skip as they always do
on these PRs. `CodeRabbit` passes on all three.

**One honest caveat:** two ordinary test shards were still running when I wrote this — `test (5)`
on #2102 and `test (6)` on #2103. Every other shard passed on every branch and these are the same
suites that were green pre-rebase, so I expect them to pass, but I have not seen them land. I will
flag it immediately if either goes red rather than let it pass as green.

## Method, for the record

- Rebased in the scratch clone (`%TEMP%\sg\p25`) on throwaway `rb/*` branches, never in the shared
  checkout, and returned the clone to `feat/stream-page-params` clean afterwards.
- Pushed with `--force-with-lease=<branch>:<old sha>` — the explicit old-head form, not the bare
  flag, so the lease is against the SHA I actually rebased from rather than whatever my
  remote-tracking ref happened to hold.

## Holds and next

- **Holding pushes on #2100, #2105 and #2107** as instructed. #2107 is at `cefc42c46` with the three
  section-layout fixes and `--debug-prerender` still on.
- **Waiting on Alpha's new flip head.** When it lands I rebase #2107 onto it, then take the
  `getCommunityDetails` callers in `community/[communityId]/(cover)/layout.tsx` and
  `(with-header)/layout.tsx` over to Alpha's cached twin from #2108 — reusing that function, not
  creating a second one — plus the two reads from the frames: `components/Community/Header.tsx:58`
  `useParams()` and `components/Pages/Communities/Impact/ImpactTabNavigator.tsx:13/:15`. That goes
  out as TASK-P2-6B4.
- **For the #2107 PR body**, per your note: `api.*` loaders are axios (`utilities/api/client.ts:1`,
  `:207`), so they never reach Next's patched `fetch` and no fetch-cache option can ever apply to
  them — `"use cache"` is the only lever. I will add that line when I next push #2107.
