# TASK-P2-BASELINE — fixed the diagnostic, baseline stays 1151

**Path taken: the lint fix, not a baseline refresh.** It was one import-order slip.

**Commit:** `8151558d9 style(donor-research): fix the import order biome's assist reports`
on `feat/instant-navigations`, pushed. Branch tip is now `8151558d9`.

## The diagnostic

```
assist/source/organizeImports
src/features/donor-research/components/common/donor-research-section-layout.tsx
```

The two `@/utilities/*` imports (`auth/token-manager`, `pages`) sat *after* the relative
`./DonorResearch*` imports. Biome's assist wants the aliased group first. The fix is a
two-line reorder; nothing else in the file changed.

The file was **added** by `6118eb158 refactor(chrome): decide navbar and footer by route
group, not by pathname` — the #2096 branch — with 187 new lines, so the diagnostic arrived
with the integration branch rather than from main.

## How it was located

`biome check --reporter=json .` at `beafe48e1` (the exact merge-base of `a0822acca` and
`origin/main`) and at the integration tip, batched, one process per revision, no build.
Format diagnostics were excluded from both sides: the working tree is CRLF everywhere and
`biome.json` sets no `lineEnding`, so every file reports a format diagnostic locally and the
count is meaningless. Lint and assist diagnostics are line-ending-insensitive, so that half
of the metric compares honestly.

```
beafe48e1  non-format: 1148
a0822acca  non-format: 1149      delta +1
after the fix              1148  delta  0
```

The raw per-file diff listed 24 additions and 24 removals besides this one, and every pair
matches: the same rule on the same file at its old and new path, e.g.

```
- lint/suspicious/noArrayIndexKey  app/community/[communityId]/manage/control-center/loading.tsx        (x4)
+ lint/suspicious/noArrayIndexKey  app/t/[tenant]/(chrome)/community/[communityId]/manage/control-center/loading.tsx  (x4)
```

Those are the route files #2093/#2094/#2096 moved into `app/t/[tenant]/(chrome)`. A move
changes a diagnostic's path, not the count. The organizeImports entry was the only addition
with no matching removal.

## Why the baseline was not touched

`quality-baseline.json` says `biome: 1151`, captured 2026-08-26 from commit `6f74e1504`.
Nothing was wrong with it — the branch had drifted by exactly one real, fixable diagnostic.
Refreshing the baseline would have absorbed a genuine lint finding and raised the number the
whole repo is held to. So the baseline is untouched and still honest at 1151.

## Why it was invisible until now

The workflows trigger on `pull_request` and on `push` to `main`. `feat/instant-navigations`
gets no run of its own, so a diagnostic introduced by a merge into it surfaces only on the
next PR that targets it — as a phantom `biome 1151 → 1152 (+1)` that the PR did not cause.
Both #2098 and #2099 reported exactly that, with disjoint file sets, which is what pinned the
cause to the base rather than to either PR.

## Follow-through on the two PRs

Both were rebased onto `8151558d9` and force-pushed, so their gates now measure a base without
the drift:

| PR | branch | new head |
|---|---|---|
| #2098 | `feat/public-loaders-no-auth` | `5e41492d2` |
| #2099 | `feat/leaf-suspense-profile-community` | `7e604b9ef` |

Zero line-ending flips on both rebases; no AI attribution in any commit.

Their CI before this rebase (on `e5a6aa196` / `dbd1ffd10`) was green on PR Tests, Smoke Tests,
QA Pipeline and PR Quality Checklist, with Quality Gate red *only* on the phantom `+1`. That
is the check this commit clears.
