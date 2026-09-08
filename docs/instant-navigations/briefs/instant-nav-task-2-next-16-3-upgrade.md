# Task 2 — Next.js 16.3.x upgrade PR (show-karma/gap-app-v2)

## Context
Phase 0 of the Instant Navigations plan. The app is on next 16.2.6 / react 19.2.1.
Next 16.3.0 went stable 2026-08-03. This PR ONLY upgrades the framework —
**do NOT enable `cacheComponents` or `partialPrefetching`** (that's a later phase).

## Your job
1. Scratch clone from main (NOT the shared checkout, and NO node_modules junction —
   this task changes deps, so it needs its own install):
   ```
   git clone --shared D:/super-gap/gap-app-v2 %TEMP%/sg-next163
   cd %TEMP%/sg-next163
   git fetch origin main && git checkout -b chore/next-16-3-upgrade origin/main
   git remote set-url origin https://github.com/show-karma/gap-app-v2.git
   pnpm install
   ```
2. `pnpm add next@16.3` (latest stable 16.3.x). Align any `@next/*` packages that version-pair
   (`@next/bundle-analyzer`, `@next/third-parties`, `@next/env` if present). Check the 16.3
   release notes / changelog for config renames affecting our `next.config.ts` (turbopack
   resolveAlias, images.qualities, staticPageGenerationTimeout, output standalone).
3. Validate, in order: `pnpm typecheck` → `pnpm exec next build` → full unit suite (vitest).
   Record build wall time and peak memory if observable — CI preview container is 8 GB and
   already tight; call out any growth vs a main baseline build.
4. Verify the standalone output gate test still passes (`__tests__/standalone-output-gate.test.ts`).
5. Push and open a PR against main with `gh pr create` (title `chore(deps): upgrade next to 16.3.x`),
   body: what changed, validation results, explicit note that instant-navigation flags are NOT enabled.

## Environment rules
- Never touch `D:\super-gap\gap-app-v2` working tree.
- `biome check` fails repo-wide on CRLF — use `pnpm exec biome lint` on touched files only.
- Keep the diff to package.json + pnpm-lock.yaml (+ config only if 16.3 requires it).
- Conventional Commits; never mention Claude/AI in commits or PR text.

## Reporting
When done (or blocked >20 min), run:
`maestri ask "Tech Leader" "TASK2 <status>: <PR number/URL, validation results, build time/memory notes, any 16.3 config changes needed>"`
