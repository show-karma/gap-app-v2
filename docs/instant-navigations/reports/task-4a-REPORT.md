# TASK4A — Report (FE Dev Alpha)

## Step 0 — integration branch: DONE

`feat/instant-navigations` created and pushed to `origin` (show-karma/gap-app-v2).

- **HEAD SHA: `6f0f5dfd13573725760370f760920b600a8df548`** (short `6f0f5dfd1`)
- Base: `origin/main` @ `beafe48e1`
- Merge 1 (`--no-ff`): `chore/next-16-3-upgrade` @ `9456b60e7` (PR #2089) — clean
- Merge 2 (`--no-ff`): `refactor/root-layout-static-shell` @ `a33a8f37a` (PR #2090) — clean
- No conflicts in either merge. PR #2051 deliberately excluded.

Frontend Dev #2 can rebase `feat/tenant-root-param-proxy` onto this now.

## Step 1+ — 4A in progress

Status updates appended below.

---

## Contract additions for 4B (Frontend Dev #2) — please read

`utilities/tenant-param.ts` exists on `feat/tenant-root-param-routes` because 4A cannot
typecheck or build without it. It implements the three agreed functions with the agreed
signatures, plus **two additions the root layout imports**:

```ts
export const KARMA_TENANT_PARAM = "karma";
export function resolveTenantParam(host: string): string;
export function listTenantParams(): string[];
export function resolveWhitelabelFromTenantParam(value: string): WhitelabelDomain | null;
export function isKnownTenantParam(value: string): boolean;   // NEW — used by the root layout
```

On merge, take **4B's version of the file** (it has the unit tests) but keep
`KARMA_TENANT_PARAM` and `isKnownTenantParam` exported, or `app/t/[tenant]/layout.tsx`
breaks. `resolveWhitelabelFromTenantParam` returns `null` both for `"karma"` and for
unknown values, which is why the layout needs the separate `isKnownTenantParam` predicate
to 404.

Two facts found while implementing, relevant to 4B:

1. **`next.config.ts` needs no root-params flag.** `next/dist/server/config.js:190` warns
   that `experimental.rootParams` "is no longer needed, because `next/root-params` is
   available by default" and tells you to remove it. Do not add it.
2. **`parseExtraWhitelabelDomainsFromEnv` is not exported** from
   `utilities/whitelabel-config.ts`. The exported `WHITELABEL_DOMAINS` array already
   concatenates the built-in configs with the env extras, so `listTenantParams()` should
   read `WHITELABEL_DOMAINS` — that is what 4A's implementation does.

---

## TASK4A COMPLETE — PR #2094 (draft)

https://github.com/show-karma/gap-app-v2/pull/2094 →  base `feat/instant-navigations`
Branch `feat/tenant-root-param-routes` @ `ec1676f1c` (510 files, 672+/371-, 405 of them renames).

### Done
1. Integration branch `feat/instant-navigations` @ `6f0f5dfd1` pushed (step 0).
2. Whole page tree `git mv`'d to `app/t/[tenant]/`. Route handlers and metadata routes stay
   at their current paths — plus `app/global-error.tsx`, which Next resolves from the app
   root (`next-app-loader/index.js:239-242`), not from the root-layout directory, so it
   cannot move. Confirmed no public `/t` route existed.
3. Root layout at `app/t/[tenant]/layout.tsx`: `generateStaticParams()` over
   `listTenantParams()`, `notFound()` on an unknown param via `isKnownTenantParam()`.
4. `getWhitelabelContext()` reads `await tenant()`; the `next/headers` import is gone.
   Render-path audit of the other importers: `blog/[slug]/page.tsx` uses `draftMode()`
   (fine, not host-derived), `token-manager.ts` is the auth path, `prefetchProjectProfile.ts`
   only mentions it in a comment, `get-tenant-server.ts` reads the host but is **dead code**
   (nothing imports it) — left alone, flagging it here.
5. Test/script path fixes across ~100 files. `next typegen` emits
   `declare module 'next/root-params' { export function tenant(): Promise<string> }`.

### Gates
- `next build` clean, `tsc --noEmit` clean, `biome lint` clean on touched files (8 warnings
  remain, all verified identical at HEAD).
- Prod-server route table, whitelabel theme/chrome, unknown-tenant 404: all verified — table
  in the PR body.
- No-JS parity **exact**: 2615 / 2082 / 7162, 0 hidden chunks, h1 present.
- Unit suite 15887 pass / 1 fail — `gsc-site-verification`, a `core.autocrlf` artefact of the
  scratch clone, proven by re-running against the blob contents. None of the 7 known
  parallel-load flakes fired.
- Readiness proof written to `.maestri/reports/task-4-cachecomponents-readiness.md`.
  **Root layout prerenders.** Remaining blockers are 34 incompatible segment configs, 2 small
  shell items, and a per-page `CLIENT_HOOK_DYNAMIC` tail.

### Two decisions that need your sign-off
1. **`export const dynamic = "force-dynamic"` on the root layout.** Removing the `headers()`
   read makes Next prerender several hundred pages at build time; that fails outright on the
   47 modules calling `useSearchParams()`, and turning ~500 routes static without triage is a
   much larger change than a routing move. The one line preserves today's rendering mode
   exactly and is what Phase 2 deletes segment by segment. Say the word if you want it out and
   the per-page work pulled into this PR instead.
2. **`route-file-structure.test.ts` re-rooted rather than re-prefixed.** You asked for the
   `SITEMAP_NO_LOADING` paths to gain the prefix; I pointed `APP_DIR` at
   `app/t/[tenant]` instead. Identical semantics, no churn in the sets, and the DEV-612 chain
   walk keeps the right ceiling. Added a case that fails if a `page.tsx` ever lands outside
   the root-layout directory.

### Blocking note
Neither Task-4 PR is deployable alone — without 4B's proxy rewrite every public URL 404s.
They must merge to the integration branch together.

---

## TASK4-MERGE — both PRs merged into the integration branch

`feat/instant-navigations` @ **`35a488ef039ba2ff2936e187f3229ef1db40736c`** (`35a488ef0`), pushed.

```
35a488ef0  Merge PR #2093: rewrite every page request to the tenant root-param tree
e03f64b80  Merge PR #2094: tenant as a root param under /t/[tenant]
```

Both `--no-ff`, in that order, onto `6f0f5dfd1`. GitHub now shows **#2094 MERGED** and
**#2093 MERGED**. 514 files, +1387 / -390 vs the pre-merge branch.

**One conflict, the predicted one:** `utilities/tenant-param.ts`, add/add. Took 4B's version,
which is a strict superset — the five names 4A imports plus the four proxy helpers, and it
carries the 27 unit tests. Verified after resolving that `isKnownTenantParam`,
`listTenantParams` and `resolveWhitelabelFromTenantParam` all still resolve from the root
layout and `whitelabel-server.ts`. It was also the *only* file both branches touched.

**Coordination:** `src/components/footer/**` and `components/DeferredLayoutComponents.tsx` are
untouched by this merge — Frontend Dev #2 can branch off `35a488ef0` cleanly. The one navbar
file in the diff is `src/components/navbar/navbar-auth-buttons.tsx`, which is 4A's pre-agreed
Suspense fix, not shell work.

### Combined acceptance gates

| Gate | Result |
|---|---|
| `tsc --noEmit` | clean |
| `next build` | clean, exit 0 |
| `biome lint` (77 files with real content changes) | 8 warnings, all verified identical at HEAD — nothing new |
| Route table | 195 entries; every route handler and metadata route still at its public path |

**Public URLs on the main host — all 200, no `Location` header, browser URLs unchanged:**
`/`, `/about`, `/communities`, `/community/optimism`, `/project/gitcoin`, `/blog`,
`/knowledge`, `/projects`, `/funding-map`, `/dashboard`, `/community/optimism/manage`.
Route handlers likewise 200 and unrewritten: `/sitemap.xml`, `/sitemap-index.xml`,
`/robots.txt`, `/openapi.json`, `/manifest.json`, `/favicon.ico`, `/.well-known/mcp.json`,
`/api/geo`, `/llms.txt`.

**Whitelabel host `app.opgrants.io`:**

| Check | Result |
|---|---|
| theme vars | `:root{--primary:353 100% 51%;--primary-foreground:0 0% 100%}` — Optimism red, and absent on the main host |
| whitelabel navbar | present ("Powered by"), absent on the main host |
| `metadataBase` / canonical | `https://app.opgrants.io/funding-opportunities` — tenant domain, correct |
| `/` | 200, serves the community funding-opportunities page |
| `/programs/1` | 200 — stripped URL resolves |
| `/funding-opportunities`, `/projects`, `/project/<slug>`, `/knowledge`, `/my-projects` | 200 |
| `/community/optimism/programs/x` | 307 → `/programs/x` — URL stripping intact, no `/t` in the target |
| `/blog` | 301 → `https://www.karmahq.org/blog` |
| `/about` | 404 — the page's own `isWhitelabel` gate, i.e. the tenant resolved |
| `/programs` (listing) | 307 → `/` — pre-existing product rule at `proxy.ts:137-141`, untouched |

**Alias hosts still 308 first:** `karmahq.org/about` and `gap.karmahq.xyz/about` →
`https://www.karmahq.org/about`; `www.karmahq.org/about` → 200.

**`/t/*` blocked:** `/t`, `/t/karma`, `/t/karma/about`, `/t/app.opgrants.io/about` and
`/T/karma/about` all 404.

**No-JS parity — measured on the real public URLs now that the proxy is in place, exact match
to the #2090 baseline:**

| Route | Visible chars | Hidden chunks | h1 |
|---|---|---|---|
| `/` | 2615 | 0 | "Fund nonprofits, projects, and initiativ…" |
| `/about` | 2082 | 0 | "About Karma" |
| `/knowledge` | 7162 | 0 | "Grant Funding Knowledge Base" |

**Unit suite — 15961 tests. Two full runs:**

| Run | Result |
|---|---|
| 1 | 15958 pass / 3 fail |
| 2 | 15959 pass / 2 fail |

All three failures are environmental, none in a file either PR touches:

- `__tests__/vercel-build.test.ts` — a wall-clock assertion, `expected 4.286 to be less than
  or equal to 4` then `expected 4.39`. `vercel-build.sh` is not in the diff. Passes in
  isolation.
- `__tests__/navbar/integration/responsive-behavior.test.tsx` — *"Unable to find a label with
  the text of: Open menu"*, the mobile drawer trigger, under a 1100-file parallel run.
  **Failed in run 1, passed in run 2**, and passes in isolation — the same parallel-load
  family as the 7 known flakes. Not the auth cluster: the query is for mobile chrome, which
  the Suspense fix does not touch.
- `__tests__/public/gsc-site-verification.test.ts` — the `core.autocrlf=true` artefact of this
  scratch clone. Proven: re-running against the blob contents passes 4/4.

CI shards across 6 jobs and does not hit the load flakes; the CRLF one cannot occur on Linux.

