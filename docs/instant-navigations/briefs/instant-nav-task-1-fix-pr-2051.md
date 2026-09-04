# Task 1 — Get PR #2051 green (show-karma/gap-app-v2)

## Context
PR #2051 "perf(community): stream portfolio-report and financials pages" (branch
`perf/stream-community-report-pages`) is Phase 0 of the Instant Navigations adoption plan.
It moves `await params` + data fetches behind `<Suspense>` on 5 community pages.
CI is failing: qa-pipeline shards **test (1)** and **test (4)** → `report` job FAILURE.
Everything else (build, smoke, static-checks, quality-gate, Vercel) is green.

## Your job
1. Inspect the failing runs: `gh run list --repo show-karma/gap-app-v2 --branch perf/stream-community-report-pages` then `gh run view <id> --log-failed`.
2. Reproduce locally, fix, push to the same branch. Scope discipline: the PR's behavior
   (Suspense boundaries, notFound() semantics, RUN_DATE_REGEX validation) must not change;
   only fix what makes the tests fail (could be flake, could be tests needing the new async
   structure, could be a rebase needed against main).
3. If a shard failure is unrelated flake from main, say so with evidence — do not paper over it.

## Environment rules (IMPORTANT — Windows shared checkout)
- **Do NOT switch branches in `D:\super-gap\gap-app-v2`** — it's a shared checkout pinned to a feature branch.
- Work in a scratch shared clone:
  ```
  git clone --shared D:/super-gap/gap-app-v2 %TEMP%/sg-2051
  cd %TEMP%/sg-2051
  git fetch origin perf/stream-community-report-pages && git checkout perf/stream-community-report-pages
  cmd /c mklink /J node_modules D:\super-gap\gap-app-v2\node_modules
  git remote set-url origin https://github.com/show-karma/gap-app-v2.git   # verify push target
  ```
  The node_modules junction is fine here because this task changes no dependencies. Never run `pnpm install` in the scratch clone while junctioned.
- `biome check` fails repo-wide on CRLF — use `pnpm exec biome lint` on touched files only.
- Some blobs store CRLF: keep edits surgical and confirm `git diff` shows ONLY your intended lines before committing.
- Conventional Commits; never mention Claude/AI in commits or PR text.

## Done =
All qa-pipeline shards + `report` green on the PR. Do NOT merge — report back and the Tech Leader merges.

## Reporting
When done (or blocked >20 min), run:
`maestri ask "Tech Leader" "TASK1 <status>: <summary — root cause, what you changed, CI state, commit SHAs>"`
