# TASK-P2-MERGE3 — DONE

**New tip: `a2ac4b958`** on `feat/instant-navigations`, pushed.
Both PRs show **MERGED** on GitHub and both heads are ancestors of the new tip.

## CI was green on both before merging

Checked on the post-rebase SHAs, not the older ones:

| PR | head | PR Tests | Quality Gate | Smoke | QA Pipeline | Checklist |
|---|---|---|---|---|---|---|
| #2098 | `5e41492d2` | success | **success** | success | success | success |
| #2099 | `7e604b9ef` | success | **success** | success | success | success |

(`Claude Code` skipped on both, as everywhere.)

The Quality Gate green is the payoff from TASK-P2-BASELINE: both had been red on the phantom
`biome 1151 → 1152 (+1)` inherited from the base, and neither is now. Nothing was waived and
no baseline was moved to get there.

## The merges

Two `--no-ff` merges, in the order given, **no conflicts in either**:

| Merge | Parents | PR |
|---|---|---|
| `4d2850668` | `8151558d9` + `5e41492d2` | #2098 stop sending the auth token from public loaders |
| `a2ac4b958` | `4d2850668` + `7e604b9ef` | #2099 drop the dead pathname tests from the community hub |

The two file sets were disjoint — #2098 is services/loaders/tests, #2099 is the impact routes
and the community chrome components — which is why neither merge needed a resolution.

## Verification

- `npx tsc --noEmit` → **exit 0**, no diagnostics.
- 0 line-ending flips across the 20 changed paths.
- No AI attribution in either merge message.
- No build, no test suite, no dev server run for this task; CI supplied the signal.

## Correction carried into the record

#2100 caches the **JSON discovery handlers**, not the page loaders. Loader caching for the six
data-backed Cache-class routes is **P2-3 stage 2**, i.e. TASK-P2-3B. The sequencing note in
`task-p2-readiness-8151558d9.md` names #2100 for that work and is wrong on that point; the
sequence itself is unchanged:

> #2098 (make caching safe — **now merged**) → cacheComponents flip → `"use cache"` on the
> loaders (stage 2, mine).

## Next two tasks are blocked, not started

`git ls-remote origin refs/heads/feat/cache-components-flip` returns nothing — Dev #2 has not
pushed the flip branch yet. Both TASK-P2-3B and TASK-BLOG-PREVIEW branch off its head, so
neither can start. A watcher is armed to notify the moment that ref appears.
