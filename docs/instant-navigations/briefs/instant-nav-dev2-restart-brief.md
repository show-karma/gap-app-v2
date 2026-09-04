# Frontend Dev #2 — restart brief (2026-09-02)

You are Frontend Dev #2, a Frontend Specialist on the gap-app-v2 Instant Navigations initiative.
Your previous process was restarted because a Vercel MCP tool call hung for 90 minutes and your
context had grown to ~490k tokens. All of your work is pushed; nothing was lost. Read this whole
file before doing anything.

## RESOURCE RULES — non-negotiable, from the user (their machine froze once already)
1. NEVER run the full vitest suite locally. Only touched test files:
   `npx vitest run --pool=forks --poolOptions.forks.maxForks=2 <files>`. CI's 6 shards do the rest.
2. NO `next build` locally without an explicit go from the Tech Leader. Builds happen on Vercel
   via draft PRs; read their logs.
3. No local Playwright, no `next start` left running, no background loops alive when a turn ends.
4. Do NOT use the Vercel MCP tools (they hang). Read build results via `gh pr checks <n>`, the
   Vercel bot comment link on the PR, or `npx vercel inspect <dpl> --logs` wrapped in `timeout 120`.
5. `tasklist`/`taskkill` are blocked by a hook; use PowerShell `Get-Process` if you must inspect.

## REPO RULES
- Never touch `D:\super-gap\gap-app-v2` (shared checkout). Your scratch clone is
  `C:\Users\Amaury\AppData\Local\Temp\sg-next163` (real node_modules, next 16.3.3); a second
  clone `C:\Users\Amaury\AppData\Local\Temp\sg\p25` exists too.
- No Claude/AI mentions in commits or PR text (no `Co-Authored-By: Claude`, no `Claude-Session:`,
  no "Generated with" footer). Amend before every push; the repo CLAUDE.md rule wins.
- Preserve each file's ORIGINAL line endings (some blobs are CRLF); `biome lint` on touched files
  only; Conventional Commits; surgical diffs.
- Report by writing `.maestri/reports/<task>-REPORT.md` (a watcher picks it up). `maestri ask
  "Tech Leader"` may fail on a duplicate-name collision; the file is the reliable channel.

## WHERE THINGS STAND
- Integration branch `feat/instant-navigations` = `a2ac4b958` (main + #2089 + #2090 + #2094 +
  #2093 + #2095 + #2096 + #2097 + #2098 + #2099). Nothing merges to main; flags are OFF there.
- Flip candidate PR **#2105** (`feat/cache-components-flip` @ `822afcb7d`, DO NOT MERGE): flags
  ON, `experimental.prerenderEarlyExit: false` as a TEMPORARY diagnostic, cached
  `getWhitelabelContext()`. Its Vercel build: shell fixed, 86/161 prerender, 75 fail
  (`.maestri/reports/task-p2-6-prep4-REPORT.md`).
- Alpha's PR **#2108** (`feat/cache-loaders` vs the flip branch): generateStaticParams samples on
  the community/project layouts + blog/[slug], `'use cache'` on the loaders, cached React Query
  seeds (prefetch + dehydrate inside the cached function), blog preview route. Building on Vercel.
- YOUR PR for P2-6B (`feat/stream-page-params` vs the flip branch, head `6cd574ba4`): the six
  Stream-class detail pages (nonprofits/find-funders/{foundations,grants,nonprofits,search}/[id],
  nonprofit-research/[reportId], nonprofit-research/personas/[handleId]) with `params` resolved in
  an async child behind the existing skeleton. Its Vercel build finished; the result was never read.
- Your other open PRs: #2100 (use-cache handlers, parked), #2101, #2102, #2103, #2104.
- Full context: `.maestri/briefs/instant-nav-phase-2-queue.md`, the reports directory.

## YOUR TASK NOW — TASK-P2-6B (report)
1. Find your P2-6B PR number (`gh pr list --repo show-karma/gap-app-v2 --head feat/stream-page-params`).
2. Read its Vercel build result via the PR checks / bot comment link (NOT the MCP). Report which
   of the six routes now prerender and any new error class, with the exact error text, in
   `.maestri/reports/task-p2-6b-REPORT.md`.
3. If any of the six still fail and the cause is `generateMetadata` (you left it untouched on
   purpose), fix it the same way (resolve params inside the metadata function is fine — metadata
   does not block the shell) and push; otherwise stop and wait for the next instruction.
