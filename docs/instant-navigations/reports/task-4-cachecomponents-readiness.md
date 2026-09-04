# Task 4 — `cacheComponents` readiness proof

Measured on a **throwaway** local build: `feat/tenant-root-param-routes` (4A, PR #2094) merged
into `feat/tenant-root-param-proxy` (4B, PR #2093), both on `feat/instant-navigations` @
`6f0f5dfd1`. Every change described here was reverted; neither PR contains any of it.

Next 16.3.3, Turbopack, `next build`.

## Verdict: READY — the root layout prerenders

**There is no root-level "uncached data / `headers()` outside Suspense" error.** The root
layout renders through to `<html>`/`<body>` on every route; every failure is scoped to a page
below it. That is the criterion the brief set, and it is met.

The one error reported against the root route `/t/[tenant]` is
`` `new Date()` in a Client Component `` at `src/components/footer/footer.tsx:54`
(`const currentYear = new Date().getFullYear()`). That is the footer's copyright year, not a
data read, and not the layout's tenant path.

## How the measurement was taken

Three passes, because the first two do not reach the prerender pass:

**Pass 1 — `cacheComponents: true` only.** Fails at *compile* time with 33 errors across 24
files, all of the form *"Route segment config `X` is not compatible with
`nextConfig.cacheComponents`. Please remove it."* No prerendering happens, so this pass proves
nothing about readiness. The blockers, which Phase 2 must remove one at a time:

| Config | Count | Files |
|---|---|---|
| `dynamic` | 18 | the 8 `app/.well-known/*` route handlers, `app/api/cron/warm-sitemaps`, `app/openapi.json`, the 5 sitemap routes, **`app/t/[tenant]/layout.tsx` (L78, `force-dynamic`)**, and 2 `nonprofit-research` token pages |
| `revalidate` | 13 | the same `.well-known` + `openapi.json` handlers, `app/sitemaps/static/sitemap.ts`, both `blog` pages, `app/t/[tenant]/project/[projectId]/layout.tsx` |
| `runtime` | 2 | `app/api/metadata/knowledge`, `app/api/scanner/og/[slug]` |

`app/t/[tenant]/layout.tsx` carrying `export const dynamic = "force-dynamic"` is deliberate in
4A — it pins the current rendering mode so the refactor changes nothing — and 4A's own comment
says this proof is measured with it removed. That is what pass 2 does.

**Pass 2 — segment configs stripped.** Compiles, prerenders, and **early-exits on the first
failing route**, reporting only 5. Partial, so not usable as a triage list.

**Pass 3 — `experimental.prerenderEarlyExit: false`.** The full list below. Note the prerender
surface multiplies: `generateStaticParams()` returns 8 tenant values (`karma` + 7 whitelabel
domains), so Next attempts **1477** page renders. That cross-product is itself a Phase-2
decision — 8 full copies of ~185 routes is likely not what we want to prerender.

## Triage input: 161 routes error

By cause (a route can have more than one):

| Cause | Routes |
|---|---|
| `new Date()` in a Client Component (the footer) | 81 |
| `usePathname()` in a Client Component outside `<Suspense>` | 80 |
| uncached/runtime data (`fetch`, `cookies`, `headers`, `params`) outside `<Suspense>` | 69 |

**The single highest-leverage fix: `src/components/footer/footer.tsx:54`.** 79 of the 161
routes fail for *that reason alone* — the footer is in the global chrome, so every prerendered
route hits it. Fixing that one line (render the year on the client after mount, or pass it in
as a cached value) clears roughly half the triage list before any per-route work starts.

After that the real Phase-2 work is the two structural ones: `usePathname()` in client
components inside the shell, and uncached server data on page bodies — which is exactly the
Stream / Cache / Block decision the plan already anticipates, with the DEV-612 rule that
crawlable `SITEMAP_NO_LOADING` routes must be **Cache, never Stream**.

## Full route list, grouped by cause

Paths below are shown without the internal `/t/[tenant]` prefix.

### `new Date()` (footer) — 79 route(s)

- `/`
- `/about`
- `/admin`
- `/admin/communities`
- `/admin/communities/stats`
- `/admin/faucet`
- `/admin/nonprofit-research`
- `/admin/projects`
- `/admin/sumup`
- `/ask-karma`
- `/auth/token-bridge`
- `/blog`
- `/communities`
- `/contact`
- `/create-project-profile`
- `/dashboard`
- `/data/foundation-funding`
- `/donations`
- `/donor-advisors`
- `/donor-rewards`
- `/empty-dashboard`
- `/evaluate`
- `/for-agents`
- `/for-projects`
- `/foundations`
- `/funders`
- `/funding-map/add-program`
- `/funding-map/manage-programs`
- `/knowledge`
- `/knowledge/ai-grant-evaluation`
- `/knowledge/dao-grant-milestones`
- `/knowledge/funding-distribution-mechanisms`
- `/knowledge/grant-accountability`
- `/knowledge/grant-document-signing`
- `/knowledge/grant-fund-disbursement`
- `/knowledge/grant-kyc`
- `/knowledge/grant-lifecycle`
- `/knowledge/how-funders-use-project-profiles`
- `/knowledge/impact-measurement`
- `/knowledge/impact-verification`
- `/knowledge/manual-vs-platform-grant-tracking`
- `/knowledge/milestones-vs-impact`
- `/knowledge/nonprofit-due-diligence`
- `/knowledge/onchain-project-profiles`
- `/knowledge/onchain-reputation`
- `/knowledge/project-profiles`
- `/knowledge/project-profiles-as-resumes`
- `/knowledge/project-profiles-software-vs-nonsoftware`
- `/knowledge/project-registry`
- `/knowledge/project-reputation`
- `/knowledge/project-updates-and-reputation`
- `/knowledge/reputation-compounding`
- `/knowledge/whitelabel-funding-platforms`
- `/knowledge/why-grant-programs-fail`
- `/knowledge/why-grantees-need-project-profiles`
- `/mcp/connect`
- `/my-projects`
- `/nonprofit-research`
- `/nonprofit-research/diligence-template`
- `/nonprofit-research/new`
- `/nonprofit-research/onboarding`
- `/nonprofit-research/personas`
- `/nonprofits`
- `/nonprofits/find-funders`
- `/nonprofits/find-funders-deep-research`
- `/nonprofits/find-funders/connect`
- `/nonprofits/find-funders/connect/chatgpt`
- `/nonprofits/find-funders/connect/claude`
- `/nonprofits/is-ai-ready`
- `/oauth/consent`
- `/old-home`
- `/privacy-policy`
- `/safe/disburse`
- `/seeds`
- `/seeds/fund`
- `/settings/connections`
- `/stats`
- `/super-admin`
- `/terms-and-conditions`

### `usePathname()` + uncached/runtime data — 67 route(s)

- `/blog/[slug]`
- `/community/[communityId]`
- `/community/[communityId]/admin/kyc-settings`
- `/community/[communityId]/applications`
- `/community/[communityId]/applications/[applicationId]`
- `/community/[communityId]/applications/[applicationId]/edit`
- `/community/[communityId]/applications/[applicationId]/success`
- `/community/[communityId]/ask-karma`
- `/community/[communityId]/browse-applications`
- `/community/[communityId]/browse-applications/[referenceNumber]`
- `/community/[communityId]/claim-funds`
- `/community/[communityId]/donate`
- `/community/[communityId]/donate/[programId]`
- `/community/[communityId]/donate/[programId]/checkout`
- `/community/[communityId]/financials`
- `/community/[communityId]/funding-opportunities`
- `/community/[communityId]/impact`
- `/community/[communityId]/impact/project-discovery`
- `/community/[communityId]/manage`
- `/community/[communityId]/manage/access-denied-messages`
- `/community/[communityId]/manage/action-items`
- `/community/[communityId]/manage/control-center`
- `/community/[communityId]/manage/edit-categories`
- `/community/[communityId]/manage/edit-projects`
- `/community/[communityId]/manage/funding-platform`
- `/community/[communityId]/manage/funding-platform/[programId]`
- `/community/[communityId]/manage/funding-platform/[programId]/applications`
- `/community/[communityId]/manage/funding-platform/[programId]/applications/[applicationId]`
- `/community/[communityId]/manage/funding-platform/[programId]/milestones`
- `/community/[communityId]/manage/funding-platform/[programId]/milestones/[projectId]`
- `/community/[communityId]/manage/funding-platform/[programId]/question-builder`
- `/community/[communityId]/manage/funding-platform/[programId]/setup`
- `/community/[communityId]/manage/impact`
- `/community/[communityId]/manage/knowledge-base`
- `/community/[communityId]/manage/kyc-settings`
- `/community/[communityId]/manage/manage-indicators`
- `/community/[communityId]/manage/milestones-report`
- `/community/[communityId]/manage/notification-settings`
- `/community/[communityId]/manage/payouts`
- `/community/[communityId]/manage/portfolio-reports`
- `/community/[communityId]/manage/portfolio-reports/[reportId]`
- `/community/[communityId]/manage/portfolio-reports/[reportId]/preview`
- `/community/[communityId]/manage/portfolio-reports/config`
- `/community/[communityId]/manage/program-scores`
- `/community/[communityId]/manage/send-email`
- `/community/[communityId]/manage/tracks`
- `/community/[communityId]/programs`
- `/community/[communityId]/programs/[programId]`
- `/community/[communityId]/programs/[programId]/apply`
- `/community/[communityId]/projects`
- `/community/[communityId]/reports`
- `/community/[communityId]/reports/[runDate]`
- `/community/[communityId]/reports/[runDate]/[configSlug]`
- `/community/[communityId]/updates`
- `/project/[projectId]`
- `/project/[projectId]/about`
- `/project/[projectId]/contact-info`
- `/project/[projectId]/funding`
- `/project/[projectId]/funding/[grantUid]`
- `/project/[projectId]/funding/[grantUid]/complete-grant`
- `/project/[projectId]/funding/[grantUid]/edit`
- `/project/[projectId]/funding/[grantUid]/impact-criteria`
- `/project/[projectId]/funding/[grantUid]/milestones-and-updates`
- `/project/[projectId]/funding/new`
- `/project/[projectId]/impact`
- `/project/[projectId]/team`
- `/project/[projectId]/updates`

### `usePathname()` — 13 route(s)

- `/admin/studio/[[...tool]]`
- `/dashboard/[module]`
- `/nonprofit-research/[reportId]`
- `/nonprofit-research/diligence/[token]`
- `/nonprofit-research/personas/[handleId]`
- `/nonprofit-research/shared/[token]`
- `/nonprofits/find-funders/foundations/[id]`
- `/nonprofits/find-funders/grants/[id]`
- `/nonprofits/find-funders/nonprofits/[id]`
- `/nonprofits/find-funders/search/[id]`
- `/nonprofits/is-ai-ready/[site]`
- `/nonprofits/is-ai-ready/scans/[id]`
- `/s/[slug]`

### `new Date()` (footer) + uncached/runtime data — 2 route(s)

- `/funding-map`
- `/projects`
