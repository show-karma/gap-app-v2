# TASK-P2-6B2 — pushed: --debug-prerender on; metadata fix NOT made, and why (Frontend Dev #2, 2026-09-02)

**PR #2107 `feat/stream-page-params`, new head `38e9dea11`** (was `6cd574ba4`). Two commits.
`tsc --noEmit` exit 0; `biome lint` clean on the five touched files; `__tests__/vercel-build.test.ts`
9/9 green (`--pool=forks --maxWorkers=2` — vitest 4 dropped `--poolOptions.forks.maxForks`).
No local `next build`, no dev server, nothing left running.

**Rebase: not needed.** `origin/feat/cache-components-flip` is still `822afcb7d`, which is already
this branch's parent. I re-fetched after committing to be sure it had not moved.

---

## Headline

I did **not** make the `generateMetadata` change, because I checked it in the Next 16.3.3 source
before writing it and the premise does not hold: **metadata already cannot block the shell at build
time.** Making the change anyway would have put unnecessary churn into the one build whose whole
job is to be readable. What I did instead was the diagnostic build (item 2), plus the layout check
— which found a single evidenced cause covering **all six** routes, not just `[reportId]`.

## 1. The metadata fix: premise disproved, two independent ways

**(a) Metadata renders inside a Suspense boundary during a build prerender.**
`next/dist/export/worker.js:186` sets `serveStreamingMetadata: true` unconditionally for the export
worker — the worker that prerenders app pages. In `next/dist/lib/metadata/metadata.js:104-121`, that
flag is exactly what decides the shape:

```js
function MetadataWrapper() {
  if (!serveStreamingMetadata) {
    return <MetadataBoundary><Metadata /></MetadataBoundary>;      // blocks
  }
  return <div hidden><MetadataBoundary>
    <Suspense name="Next.Metadata"><Metadata /></Suspense>          // does not block
  </MetadataBoundary></div>;
}
```

`MetadataOutlet` is wrapped the same way. So at prerender time `await params` inside
`generateMetadata` suspends *inside a boundary*, which is precisely the thing cacheComponents
permits. Your parenthetical was right, and it is right for a checkable reason rather than by
convention. (At request time the flag comes from the UA — `base-server.js:1085`,
`shouldServeStreamingMetadata` — so it is only ever false for HTML-limited bots, never for a build.)

**(b) The SEO fetches were not uncached either.** My own first guess was that
`fetch(..., { next: { revalidate: 3600 } })` in three of those metadata functions
(`foundations`, `grants`, `nonprofits`) had become plain uncached I/O under cacheComponents. It has
not. `next/dist/server/lib/patch-fetch.js:151` `createCachedPrerenderResponse` is the
cacheComponents prerender path and it writes the entry; the comment at `:767-773` says the opposite
case explicitly — fetches **that do not specify a cache configuration** are the ones excluded from
prerenders. An explicit `revalidate` is a cache configuration. Converting them to
`"use cache"` + `cacheLife("hours")` would have been a no-op with one real regression: a transient
indexer failure would get its `null` cached for an hour, where the fetch cache does not persist a
failure.

**So there is no mechanical metadata fix to make.** The remaining shape of those functions —
`await params` inside an async `generateMetadata`, then pure `customMetadata()` (`utilities/meta.ts`
is pure: no `headers()`, no `cookies()`) — is already the target state. Five of six read params
there (`foundations`, `grants`, `nonprofits`, `search`, `personas/[handleId]`);
`nonprofit-research/[reportId]` uses a static `export const metadata`. **`[reportId]` failing
alongside the other five is itself the disproof from the build side**: it has no metadata params
read at all and fails identically. Say the word if you still want the change and I will push it in
ten minutes — I am reporting evidence, not refusing.

## 2. The layout check — and it covers all six, not just `[reportId]`

You asked me to look at `nonprofit-research/layout.tsx` because `[reportId]` fails too. It does have
a URL read, and so does the find-funders chain. Both are the same class, `CLIENT_HOOK_DYNAMIC`,
above `children`, with no boundary:

| Routes | File | Read |
|---|---|---|
| the 2 `nonprofit-research` routes | `(chrome)/nonprofit-research/layout.tsx` → re-exports `src/features/donor-research/components/common/donor-research-section-layout.tsx` (`"use client"`) | `usePathname()` at the top of `DonorResearchSectionLayout`, used for `isTokenRoute` / `isPublicIndex` / `isShellless`, i.e. it decides what wraps `children` |
| the 4 `find-funders` routes | `(bare)/nonprofits/find-funders/layout.tsx` → `<NonProfitsNavbar />` above `{children}` (`"use client"`) | `usePathname()` at `src/features/non-profits/components/non-profits-navbar.tsx:106`, one use: `isHomepage = pathname === NON_PROFITS_PAGES.HOME` |

That is one cause for all six, it sits **above** the page, and it explains cleanly why P2-6B did
nothing: I moved the `params` read below a boundary, and the blocker was never the `params` read.

**This is the same class `bbb6f3eda` ("fix(shell): let the global chrome prerender") already fixed
once**, and the way it fixed it matters. From `(chrome)/layout.tsx`:

> Which routes get chrome used to be a `usePathname()` test … a client component reading URL state
> is exactly what stops a route from being prerendered (`CLIENT_HOOK_DYNAMIC`). Since the answer is
> purely "which section of the site is this", the route tree can answer it instead …
> **No Suspense boundary here, and none below it above the page** — a boundary over the navbar
> streams it as a hidden late chunk and costs a crawlable page its whole internal link graph
> (DEV-612).

So the obvious one-line fix — wrap the navbar in `<Suspense>` — is the thing that precedent
forbids, and it is forbidden *here specifically*: `/nonprofits/find-funders` and its `/connect`
pages **are** in `app/sitemaps/static/sitemap.ts` and render this same navbar. The fix has to
remove the read, as #2096 did.

**I did not do that surgery, deliberately.** Neither case is mechanical:

- **`NonProfitsNavbar`** — the route tree cannot answer `isHomepage` as it stands, because the
  landing page and the four detail routes share one layout. Answering it the #2096 way means
  splitting the find-funders subtree so the landing page gets its own layout that passes
  `isHomepage`. That is a route-tree change on a crawlable section.
- **`DonorResearchSectionLayout`** — a boundary there *is* above page content, and would sit above
  the whole donor-research section including the two anonymous token routes. Those routes are
  noindex and auth-gated so DEV-612 does not bite, but this is the component that gates auth and
  clears the React Query cache across Privy identities; it is not something to restructure on an
  inference while a build that will confirm or kill the inference is already running.

Both are yours to call, and the stacks land first. I can implement either in one push.

## 3. What is on the branch

**`2566af07b` `chore(build): run the prerender pass with --debug-prerender`** — `vercel-build.sh`:

```bash
NEXT_BUILD_ARGS=(--debug-prerender)
...
timeout -k "${KILL_GRACE_SECONDS}s" "${SOFT_DEADLINE_SECONDS}s" pnpm build "${NEXT_BUILD_ARGS[@]}"
```

Three things worth knowing before you read the log:

- **`--debug-prerender` runs the prerender pass with `NODE_ENV='development'`**
  (`next/dist/cli/next-build.js:66`), and Next prints a warning saying so. That is what preserves
  the server stacks. It also means the log is a dev-mode render — treat timings in it as
  meaningless, and expect it to be slower.
- **The ceiling goes 480 → 900 in the same block and comes back with it.** A build killed at the
  ceiling produces no failure list at all, which is the one thing this build exists to produce.
  Still well inside Vercel's own timeout, so the guard still bounds the build. The header comment
  in the file still describes the permanent 480 design; the TEMPORARY block sits directly on the
  assignment.
- **The flag really reaches `next build`.** `pnpm build` is `npm run build:widget && next build`,
  and pnpm appends run-args to the end of the chained command. I verified that against pnpm
  10.34.3 with a throwaway package rather than assuming it. The `vercel-build.sh` suite still
  passes: its harness rewrites `BUILD_CEILING_SECONDS=<n>` by regex (the new value matches) and its
  stub `pnpm` ignores argv.

Removal before merge is one commit: the `NEXT_BUILD_ARGS` block, the ceiling back to 480, and
`experimental.prerenderEarlyExit` in `next.config.ts` — the comment says so in both files.

**`38e9dea11` `docs(prerender): correct the sitemap claim on the find-funders detail pages`** —
comments only. The P2-6B comment (and the `6cd574ba4` commit body) justified the boundary with
"nothing under find-funders is in the sitemap". That is false — the section landing and its
`/connect` pages are listed. The four `[id]` detail routes genuinely are not, so the boundary is
still fine, but the justification had to be narrowed: as written it invited the same boundary one
level up, where DEV-612 does apply. I left the pushed commit body alone rather than rewrite a
branch you may be tracking.

## What I need from you

The `--debug-prerender` stacks for the six. Concretely: whether they name
`DonorResearchSectionLayout` / `NonProfitsNavbar` (or any other client component reading URL state)
rather than `whitelabel-context.tsx:41`. If they do, tell me which of the two fixes above to take
and I will push it. If they name something else entirely, send the frames and I will work from them.
