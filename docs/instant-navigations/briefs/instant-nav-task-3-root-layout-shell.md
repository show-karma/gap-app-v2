# Task 3 — Phase 1: unblock the App Shell (root layout refactor)

## Context
`app/layout.tsx` (RootLayout) awaits `getWhitelabelContext()` → `headers()` (host-based
whitelabel detection, `utilities/whitelabel-server.ts`). Under Next 16.3 `cacheComponents`,
a root layout that awaits request data blocks the prerendered App Shell for EVERY route.
This refactor is behavior-neutral today (everything is dynamic anyway) and is the
prerequisite for enabling the flags.

## Design (Option A — approved)
1. RootLayout becomes request-independent: `<html>` + font variables + `<body>` +
   `ThemeProvider` + static structure. No `await` of headers/whitelabel anywhere in it.
2. New server component `TenantChrome` (children-as-prop), rendered inside `<Suspense>`,
   awaits `getWhitelabelContext()` and renders: `PrivyProviderWrapper(tenantConfig)`,
   `WhitelabelProvider`, `TenantStoreInitializer`, `PermissionsProvider`,
   `DeferredLayoutComponents`, navbar switch (`WhitelabelNavbar` vs `GlobalNavbarSlot`),
   `FooterSwitcher`, `OrganizationJsonLd` (main domain only).
3. The whitelabel `themeStyle` currently inlined on `<html style>` moves DOWN: apply the
   `--primary` / `--primary-foreground` CSS vars on the `data-app-content` wrapper (or emit a
   streamed `<style>` tag from TenantChrome). Verify tenant theme still cascades everywhere
   it's consumed (grep for var(--primary) usage in whitelabel components).
4. Suspense fallback: minimal neutral shell (same wrapper divs + skeleton, default theme).
   Accepted trade-off: whitelabel first-load may flash a neutral shell briefly.
5. `generateMetadata`/`generateViewport` may keep awaiting headers — metadata does not block the shell.
6. Do NOT enable `cacheComponents` in this PR. The PR must be a no-op for the current build mode.

## Validation
- `pnpm typecheck`, `pnpm exec next build` clean.
- Unit/integration suites green; extend any layout smoke tests for the new structure.
- Manual on preview: main domain (light/dark, navbar, footer, toasts) AND at least one
  whitelabel domain (theme colors, WhitelabelNavbar, stripped URLs).
- No-JS check must still pass for crawlable routes: the fallback must not permanently hide
  page HTML (Suspense streams the real content in the same document; verify with
  `node scripts/crawl-sitemap.mjs --visibility-mode no-js` if runnable).
- `__tests__/app/route-file-structure.test.ts` must still pass unchanged (its premise changes
  only when flags flip — do not edit SITEMAP_NO_LOADING here).

## Environment rules
Same as Tasks 1/2: scratch shared clone from origin/main (junction node_modules is OK — no
dep changes), never touch D:\super-gap\gap-app-v2, biome lint only on touched files,
surgical diffs (CRLF blobs), Conventional Commits, no AI mentions.
Branch: `refactor/root-layout-static-shell`. Open PR against main.

## Reporting
`maestri ask "Tech Leader" "TASK3 <status>: <PR, what moved where, theme-var approach chosen, test results, whitelabel verification notes>"`
