# TASK-P2-6-PREP2 — the first real `cacheComponents` build (Frontend Dev #2, 2026-09-02)

Remote build only. No local build was run at any point.

**Status: both builds have now failed, identically.**

| Build | Commit | Base | Result |
|---|---|---|---|
| 1 | `7734fb94a` | `8151558d9` | FAILED after 145 s |
| 2 | `758a6c3f6` | `a2ac4b958` (+#2098 +#2099) | FAILED after ~150 s |

Same route, same stack frame, same line. Compile passed both times (TypeScript 66 s / 61 s),
350 pages both times, and both died about 2 seconds into static generation. **#2098 and #2099
changed nothing about this failure**, which is expected: the blocker is above every route.

---

## Where the build got to

Vercel, `dpl_9y4hRX1wuyWCAC4nF63oCNGdH9fx`, Enhanced Build Machine (8 cores / 16 GB), iad1.

| Phase | Result |
|---|---|
| Install (3,429 packages) | ✓ — *"Lockfile is up to date, resolution step is skipped"*, so the release-age guard never ran, exactly as #2089 predicted |
| Compile | **✓ Compiled successfully in 69 s** |
| TypeScript | **✓ Finished in 66 s** |
| Collect page data | ✓, 7 workers |
| Generate static pages | started — **350 pages**, then died on the first one that failed |
| Total | **Build failed with exit 1 after 145 s** |

Two things worth banking from that table:

- **`cacheComponents` compiles.** The flag, the segment-config removals and the six
  `instant = false` exports are accepted by the compiler. Nothing in the flip commit is
  syntactically or structurally wrong.
- **350 pages, not 1,477.** D3 (karma-only `generateStaticParams`) held on a real build. The
  readiness report's 8-tenant cross-product is gone.
- Next's flag banner printed `✓ globalNotFound`, confirming that option survived the rebase.

## The failure

```
Error: Route "/t/[tenant]/community/[communityId]/reports": Next.js encountered uncached or
runtime data during prerendering.
`fetch(...)`, `cookies()`, `headers()`, `params`, `searchParams`, or `connection()` accessed
outside of <Suspense> prevents the route from being prerendered…
  - [stream] Provide a placeholder with <Suspense fallback={...}> around the data access
  - [cache]  For uncached data: cache the access with "use cache"
  - [block]  Set `export const instant = false` to allow a blocking route

    at <unknown> (utilities/whitelabel-context.tsx:41:3)
    at k        (components/Utilities/PrivyProviderWrapper.tsx:70:3)
    at <unknown> (contexts/privy-bridge-context.tsx:82:39)
    at l        (components/Utilities/PrivyProviderWrapper.tsx:138:48)
    at body / at html

Error occurred prerendering page "/t/karma/community/[communityId]/reports".
Export encountered an error on
  /t/[tenant]/(chrome)/community/[communityId]/(cover)/reports/page
exiting the build.
```

### Read the stack, not the route name

The named route is incidental. The frames are `html → body → PrivyProviderWrapper →
privy-bridge-context → PrivyProviderWrapper → WhitelabelProvider`, and the pointer lands on
`utilities/whitelabel-context.tsx:41`. **This is the root-layout shell failing, not the reports
page.** `/…/reports` is simply whichever route the 7 workers reached first.

The line it points at is doing exactly what its own comment says it does:

```ts
// That does mean this provider suspends until the host is known. It is
// deliberately NOT wrapped in a Suspense boundary: without one, React holds
// the shell until the promise settles and then emits one complete document.
// With one, everything below — the page included — would stream as a hidden
// late chunk that only JavaScript reveals, which is what DEV-612 forbids for
// sitemap-crawlable routes.
const resolved = value instanceof Promise ? use(value) : value;
```

So P2-6's first blocker is **a head-on collision between two rules we already committed to**:

- **DEV-612** forbids a Suspense boundary above crawlable content — a boundary there streams the
  page as `<div hidden id="S:n">` and costs the route its no-JS content and link graph.
- **`cacheComponents`** forbids resolving runtime data outside a Suspense boundary.

`WhitelabelProvider` sits precisely where those two rules meet, and Next's own error message
offers three ways out of which **only one is open to us**:

| Next's suggestion | Verdict |
|---|---|
| `[stream]` wrap it in `<Suspense>` | **Forbidden.** This is the DEV-612 violation the comment was written to prevent — and PREP2's sibling measurement on #2102 showed what that looks like in practice: content moves into a hidden chunk. |
| `[block]` `export const instant = false` | **Wrong scope.** It would have to go on every crawlable route, which is the opposite of what P2-6 is for. |
| `[cache]` `"use cache"` | **The only viable direction.** The whitelabel context is derived purely from the `[tenant]` root param — URL-derived, no I/O — so it is cacheable almost by definition. The work is making `getWhitelabelContext()` in `utilities/whitelabel-server.ts` a cached read so the promise resolves from cache during prerender rather than counting as runtime data. |

That is a shell change, not a loader change, so it is not inside P2-3 stage 2 and I have not
touched it. It is the single highest-leverage item now: it sits above every one of the 350
pages.

## The build stops at the FIRST failing route — this needs a decision

`experimental.prerenderEarlyExit` defaults to **`true`** in 16.3.3 (confirmed:
`config-shared.js:199`). So this PR yields **one failing route per build**, not a list. Alpha's
readiness pass 3 got the 161-route triage list only by setting it to `false` locally.

As configured, PR #2105 cannot produce the failing-route list the task asks for — it will report
one route, we fix it, and the next build reports the next one. **Recommend adding
`experimental.prerenderEarlyExit: false` to the flip branch** as an explicitly temporary,
clearly-commented diagnostic line, so one remote build enumerates everything. It is a one-line
change and I can push it the moment you say so; I have not done it unasked because it alters the
flip PR's config.

Also worth knowing: **GitHub Actions does not build this PR.** The `build` job reports
`skipping`, so Vercel is the only place a real `next build` happens. Everything else on the PR —
`static-checks` (pass, 1m50s), `quality-gate`, `smoke`, `test (1..6)` — runs without a build.

## What did NOT show up, and why that means nothing yet

The readiness report's largest single cause — `new Date()` in `src/components/footer/footer.tsx`,
79 of 161 routes — **did not appear in this log.** Do not read that as fixed. The build died 2
seconds into static generation on the first route; nothing downstream of the shell was reached.
Whether #2095 cleared the footer is unknown until a build gets past `WhitelabelProvider`.

## Links

- Failed deployment: <https://vercel.com/karma-devs/gap-app-v2/9y4hRX1wuyWCAC4nF63oCNGdH9fx>
  (`npx vercel inspect dpl_9y4hRX1wuyWCAC4nF63oCNGdH9fx --logs`)
- Build 2, failed identically (`errorCode: nextjs_docs`, `errorStep: buildStep`):
  <https://vercel.com/karma-devs/gap-app-v2/H5nzwFvYe5n6rLLB5747nndMh7pT>
- PR: <https://github.com/show-karma/gap-app-v2/pull/2105>
