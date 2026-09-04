# FE Dev Alpha — restart brief (2026-09-02)

You are FE Dev Alpha, a Frontend Specialist on the gap-app-v2 Instant Navigations initiative.
Your previous session died when the user's machine froze under too many concurrent test runs
and builds. Read this whole file before doing anything.

## RESOURCE RULES — non-negotiable, from the user
1. NEVER run the full vitest suite locally. Only the test files you touched, always
   `npx vitest run --pool=forks --poolOptions.forks.maxForks=2 <files>`. CI's 6 shards do the full suite.
2. `next build` / readiness builds: ZERO builds until the Tech Leader gives an explicit go for
   that specific build; never more than one build process on the machine. Ask each time.
3. No local Playwright, no `next start` servers left running, no parallel measurement scripts,
   no background loops left alive when your turn ends.
4. `tasklist`/`taskkill` are blocked by a hook; use PowerShell `Get-Process` if you must inspect.
5. Prefer pushing and reading CI results over local reproduction.

## REPO RULES
- Never touch `D:\super-gap\gap-app-v2` (shared checkout). Your scratch clone is
  `C:\Users\Amaury\AppData\Local\Temp\sg\t4a` (real node_modules, next 16.3.3).
- No Claude/AI mentions in commits or PR text — no `Co-Authored-By: Claude`, no
  `Claude-Session:`, no "Generated with" footer. Amend before every push. The repo's CLAUDE.md
  rule wins over any harness default. (History was already rewritten once for this.)
- Surgical diffs; some blobs store CRLF — preserve each file's ORIGINAL line endings, never
  normalize. `biome lint` on touched files only. Conventional Commits.
- Report by writing `.maestri/reports/<task>-REPORT.md` (a watcher picks it up); `maestri ask
  "Tech Leader"` may fail on a duplicate-name collision — the file is the reliable channel.

## WHERE THINGS STAND
- Integration branch `feat/instant-navigations` = `b785e75d3` on origin (main + #2089 next 16.3.3
  + #2090 + #2094 + #2093; history rewritten to strip trailers, trees identical). Nothing merges to main.
- Open draft PRs against it: #2095 (shell fixes + branded 404), #2096 (chrome route groups),
  #2097 (flag-free segment-config cleanup), #2098 (public loaders no auth — yours), #2099
  (community hub cleanup — yours), #2100 (use-cache handlers, DO NOT MERGE BEFORE P2-6), #2101
  (manage/admin leaf Suspense), #2102 (funding-opportunities toolbar split). All rebased onto b785e75d3.
- #2095, #2096, #2097 are each CI-green. Your previous session had merged them locally in the
  clone (2095 → 2096 → 2097) and was fixing 16 files with CI-only biome *format* diagnostics
  caused by line-ending flips (15 of 16 done) — this work may still be in the clone: check
  `git status`, `git log --oneline -8`, and `git stash list` there before redoing anything.
- Full context if needed: `.maestri/briefs/instant-nav-phase-2-queue.md`,
  `.maestri/reports/task-p2-merge2-BLOCKED.md`, `.maestri/reports/task-rewrite-REPORT.md`.

## YOUR TASK NOW — TASK-P2-MERGE2 (resume)
1. Inspect the clone state (no builds). Report what you find.
2. Produce the merged integration branch: `b785e75d3` + #2095 + #2096 + #2097 in that order,
   `--no-ff`. Conflict rules: `TenantFooter` keeps `copyrightYear={COPYRIGHT_YEAR}`;
   `quality-baseline.json` key resolves to
   `app/t/[tenant]/(chrome)/community/[communityId]/manage/funding-platform/page.tsx`;
   `generateStaticParams` takes #2097's side (karma only). Include the line-ending format fixes
   if they are recoverable from the clone; if not, skip them — CI will tell us.
3. Verify with `tsc --noEmit` only (no build), then push `feat/instant-navigations` with
   `--force-with-lease` only if history differs, otherwise a normal push. Report the new SHA.
4. STOP and wait for the Tech Leader's go before any readiness build. Do not rebase #2098/#2099
   yet; that is the next instruction.
