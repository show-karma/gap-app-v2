# TASK1 REPORT — PR #2051 (show-karma/gap-app-v2)

**Status: DONE — test shards fixed, every code gate green. One blocker outside my scope.**
Not merged, as instructed.

Branch: `perf/stream-community-report-pages` @ `9c11b047e`

## Root cause — real, not flake

The PR wrapped five community pages in `<Suspense>`, so a client-side
`render(await Page(...))` now mounts only the `loading.tsx` skeleton and never the
content. The PR had already solved exactly this inside
`__tests__/integration/pages/smoke/community-async-pages.test.tsx` with a
`resolveServerElement` walker — but two **pre-existing** suites that render the same
pages were never updated:

| Suite | Shard | Failure |
|---|---|---|
| `__tests__/app/community-cover-group.test.tsx` | test (4) | 4 × `expected [] to have a length of 1` (single-`<h1>` assertions) |
| `__tests__/integration/pages/smoke/whitelabel-pages.test.tsx` | test (1) | `Unable to find [data-testid="public-control-center"]` |

All five failures were reproduced locally before anything was changed.

## Commits

### `7b61b7afa` — test(community): resolve streamed cover pages in the smoke tests
Lifted `resolveServerElement` out of `community-async-pages.test.tsx` into
`__tests__/helpers/resolveServerElement.ts` so all three suites share one definition,
and used it in the two that were left behind. +51/−31 across 4 files, test files only.

**No behaviour change**: Suspense boundaries, `notFound()` semantics and
`RUN_DATE_REGEX` validation are untouched.

### `9c11b047e` — Merge origin/main
Needed, not cosmetic. The branch forked from `main` at `1f8317157` (Aug 21) and GitHub
pinned `pull_request.base.sha` there, which broke two gates that landed on main since:

- `quality-gate.yml` diffs `BASE...HEAD` against the **merge ref**, so it attributed
  10 days of main's own commits (`CODEOWNERS`, `quality-gate.yml`,
  `quality-baseline.json`, `scripts/quality-gate.js`, …) to this PR →
  `baseline-guard` + `gate-guard` FAIL.
- `pr-checklist.yml` checks out the **raw PR head** and runs
  `scripts/check-design-system.js`, which does not exist at that fork point →
  `MODULE_NOT_FOUND`, failing closed → `checklist` FAIL.

Clean auto-merge, no conflicts, no dependency changes. `next.config.ts` kept both
sides (`agentRules` + the standalone-output gate, **and** main's token-bridge
headers); `package.json` only gained the `design:check` script. `baseRefOid` has since
moved to `e8b8b3e5b` and all three gates now pass.

## CI state on `9c11b047e`

PASS: `test (1)`–`test (6)`, `report`, `build`, `smoke`, `static-checks`,
`quality-gate`, `baseline-guard`, `gate-guard`, `checklist`, `react-doctor`,
`review-gate`, `Vercel`, `CodeRabbit`.

Verified locally as well: 44/44 tests on the affected files, `tsc` clean on the files I
touched, `biome lint` clean, `design:check --changed` = 0 errors.

## Still red — not fixable from a branch

`qa-plan`, `dogfood (1)`, `dogfood (2)`, `verdict`, `qa-pipeline`.

Every one dies on:

```
Failed to authenticate. API Error: 401 OAuth access token has expired. Re-authenticate to continue.
```

The Claude OAuth secret in the repo has expired. Evidence it is repo-wide and not this
PR: `qa-plan` fails identically on open PRs **#2085** and **#2060**. Someone with
secret access needs to re-auth; nothing in the PR can move it.

## Environment

Worked entirely in `%TEMP%/sg-2051` (`git clone --shared` + `node_modules` junction).
`D:/super-gap/gap-app-v2` was never checked out or modified.

## Note on delivery

`maestri ask "Tech Leader"` refuses to send: *"Multiple terminals named 'Tech Leader'
found (2). Rename them to have unique names."* There is no id-based addressing in the
CLI, hence this file.
