# DEV-496 — Funding-Platform Link Consolidation (Phase 1)

## Status (2026-07-13)

**Decisions locked** (from the sheet review): ref uniqueness = **guarantee it at the source**, then the canonical URL is **only `/applications/:ref`** (no `programId` in the URL); guard = **always redirect, page self-gates**; milestones pure-public viewer = **Access Denied** (no redirect).

- **Reference-number uniqueness: DONE** on branch `bruno/dev-496-unique-application-reference` (gap-indexer, uncommitted). Root cause: refs were `Math.random()` with only a non-unique index and no collision check. Fix: `FundingApplicationWriteService.generateUniqueReferenceNumber()` (bounded lookup-retry) now used by both write controllers + the agent submission tool; `referenceNumber` promoted to `@unique` in `prisma/schema.prisma`. Tests: new unique-reference suite 3/3; full affected suites 1355/1355; lint + typecheck clean.
  - **DEPLOY GATE:** the `@unique` index is created by `prisma db push` against the Mongo `funding_applications` collection — it FAILS if any duplicate `referenceNumber` exists today. Run a dup-check aggregation first (`$group` on referenceNumber, `$match count>1`); expected zero, but must confirm before the push.
- **Phase 1a (application detail redirect): DONE** on branch `bruno/dev-496-funding-platform-consolidation` (gap-app-v2, uncommitted). `getApplicationDetailUrl` takes an optional `{ tab }` context (programId dropped — ref is canonical); `FundingPlatformGuard` gained opt-in `onDeniedRedirectTo` (redirects resolved denials, never on `isGuestDueToError`) and `redirectResolving` (spinner while an async target resolves); the manage application detail route wires it to `/applications/:ref`.
- **Phase 1b (milestones redirect): DONE.** New `useGranteeMilestoneRedirect` hook finds the viewer's application whose `projectUID` matches the route's `:projectUid` and targets `/applications/:ref?tab=milestones`; no match (pure-public, or apps for other projects) → `null` → the guard shows Access Denied. Wired on the manage milestones route with `redirectResolving`.
- **Application list redirect: DONE.** The review-queue route (`.../applications`) redirects a denied non-reviewer to the public `getBrowseApplicationsUrl(...)` (Mahesh's "if the queue is shared with a grantee, we redirect").
- **FE tests:** 27 green (URL 6, guard 6, grantee-access 9 unchanged, milestone-redirect 6) + manage regression 2/2; biome + tsc clean (only the 12 pre-existing unrelated `rotating-word.test.tsx` errors remain). **Pre-merge gate:** E2E flows 1–8 on preview (both hosts).

## Out of scope / follow-up (the "clean up URL" sheet rows — NOT redirect consolidation)
- **Reports** (J5): merge admin `preview` URL ↔ public `/reports/:runDate`.
- **Milestones report** (J7): repoint its row links to the one canonical milestone URL; page stays reviewer-only.
- **Reviewer/admin workspace** (J8): delete the `PAGES.REVIEWER.*` alias (byte-identical to `PAGES.MANAGE.*`) and fix call-site drift (raw vs parsed programId, community UID vs slug in Control Center).
- **Payouts / Financials:** explicitly excluded (Mahesh — redesign pending).


**Goal:** collapse the role-split links in the `/funding-platform` area onto one canonical
public URL per entity, and redirect applicants who are handed a `/manage/…` URL to that
public URL. Start with **application detail**, then extend the same seam to **milestones**
and the **applications list**.

**Rule of the whole effort:** one entity → one canonical URL `/applications/:ref`, with
**programId carried as resolved context**, not as a required path segment. `/manage/funding-platform/:programId/…`
stays the reviewer **workspace**; it funnels non-reviewers out to the public page.

Source of decisions: DEV-496 sheet (gid 1502133516) + Mahesh↔Bruno comment threads (see `## Decisions` below).

---

## Decisions (from the sheet + comments)

| Feature | Decision | Notes from thread |
|---|---|---|
| Application detail | **Move forward with consolidation** | Phase 1 target |
| Milestones | **TBD → consolidate via application page** | Grantee link already repointed to `/applications/:applicationReference`. Mahesh: if `:ref` isn't unique, "public URL should also have programId context" |
| Application review queue | **TBD** | Mahesh: "if queue view is shared with a grantee, then we redirect" |
| Reports | Clean up URL (separate task) | Merge admin preview URL ↔ public URL |
| Milestones report (admin) | Clean up URL (separate task) | Stays reviewer-only, not public |
| Reviewer / admin workspace | Clean up URL (separate task) | Delete `PAGES.REVIEWER.*` alias, fix call-site drift |
| Payouts / Financials | **Don't consolidate** | Financials redesign pending — out of scope |

This plan implements the **first three rows**. The "clean up URL" rows are a separate, smaller sweep.

---

## Current state (verified in code)

- **Public page** `app/community/[communityId]/(whitelabel)/applications/[applicationId]/page.tsx`
  is a **server component** that already: fetches the application by ref (`/v2/funding-applications/:ref`),
  reads `app.programId`, fetches the program config, and mounts
  `PermissionProvider resourceContext={{ programId, applicationId }}`. **programId context and RBAC already exist on this page** — it just doesn't render reviewer controls yet.
- **Tab state** on that page uses `useUrlTabState()` → `?tab=milestones` already works.
- **Manage detail page** `…/manage/funding-platform/[programId]/applications/[applicationId]/page.tsx`
  is a **client component**: it parses `programId` (strips the `_chainId` suffix) and wraps
  `ApplicationDetailView` in `FundingPlatformGuard`.
- **`FundingPlatformGuard`** (`src/core/rbac/components/funding-platform-guard.tsx`): on denial it renders
  a **hard inline "Access Denied" red box** — no redirect, no applicant awareness. This is the dead end
  an applicant hits today.
- **`ManageDeniedView`** (`components/Manage/ManageDeniedView.tsx`): a richer denial used at the **manage layout**
  level that adds a "View your application" **link** (not a redirect) — and only when the applicant has
  **exactly one** application (`buildGranteeRedirect` requires `applicationCount === 1`).
- **Reusable pieces:**
  - `getApplicationDetailUrl(communityId, referenceNumber, whitelabelOrigin?)` — builds the canonical, whitelabel-aware `/applications/:ref` (`utilities/fundingPlatformUrls.ts:160`).
  - `buildGranteeRedirect({ communityId, referenceNumber?, applicationCount, whitelabelOrigin? })` → `{ kind, url }` (`…:179`).
  - `useGranteeApplicationAccess({ enabled, communityId, programId, whitelabelOrigin })` — tri-state applicant lookup (`src/core/rbac/hooks/use-grantee-application-access.ts`).

---

## Production reality (assumptions to verify before coding)

- `/v2/funding-applications/:identifier` resolves by **referenceNumber** (the public page already relies on this). — VERIFIED (page fetches by the `[applicationId]` param, which is the ref).
- The manage route param `[applicationId]` is the **referenceNumber**, same token the public route uses, so a redirect can pass it straight through. — VERIFIED by the two page files reading the same identifier; **CONFIRM** no caller passes the internal numeric id.
- Reference numbers are unique per environment (format `APP-XXXX-XXXX`). — **UNVERIFIED**; Bruno flagged risk, Mahesh prefers `?programId=` as a disambiguator. Plan carries programId as a query param regardless (cheap, backwards-compatible).
- `combinedProgramId` on manage routes may include a `_chainId` suffix; the public URL should carry the **normalized** programId. — VERIFIED (manage page already strips `_`).

---

## User flows (the unit of "done")

A flow is done only when walked end-to-end against a deployed preview, on **app.filpgf.io** and karmahq.xyz.

1. **Grantee → own application** — opens `/applications/:ref`. Unchanged: full owner view.
2. **Reviewer → manage** — opens `/manage/funding-platform/:programId/applications/:ref`. Unchanged: review workspace.
3. **Applicant handed a manage link (their own app), app open** — `/manage/…/applications/:ref` → **307 → `/applications/:ref?programId=:programId`**, owner view.
4. **Applicant handed a manage link for a *different* app** — same redirect target derived from the **URL's** ref; destination page self-gates (public view, or sign-in for private). "no matter if of the same application."
5. **Logged-out user → manage link** — redirected to `/applications/:ref` (public or sign-in).
6. **Applicant → manage milestones link** — `/manage/…/milestones/:projectUid` → **307 → `/applications/:ref?programId=:programId&tab=milestones`**.
7. **Applicant → manage applications list** — `/manage/…/applications` → redirect to their own applications list / `/browse-applications?programId=:programId`.
8. **Reviewer copies link from workspace** — copies canonical `/applications/:ref` (not `window.location.href`).

---

## Redirect matrix

| Route (reviewer workspace) | Viewer = reviewer/admin for `:programId` | Viewer = applicant / public |
|---|---|---|
| `/manage/funding-platform/:programId/applications/:ref` | render `ApplicationDetailView` (unchanged) | `307 → /applications/:ref?programId=:programId` (preserve `?tab=`, `#anchor`) |
| `/manage/funding-platform/:programId/milestones/:projectUid` | render milestones workspace (unchanged) | `307 → /applications/:ref?programId=:programId&tab=milestones` † |
| `/manage/funding-platform/:programId/applications` (list) | render review queue (unchanged) | `307 → /applications` (own) or `/browse-applications?programId=:programId` |

† Milestones redirect needs the applicant's `:ref` for that program — resolved via `useGranteeApplicationAccess({ programId })`, which already returns their referenceNumber. If they have no application in the program (pure public), fall back to the public grant page or the community updates feed.

**Why not middleware:** the redirect decision needs the viewer's **role for `:programId`**, which middleware can't get without an RBAC/API call. Keep the decision in the route/guard.

**"Application is open":** the guard always redirects; the destination `/applications/:ref` page enforces open-vs-locked (it already renders a `Lock` "Application Not Available / sign in" state for private/missing apps). → **Decision point for Bruno:** always-redirect (simple) vs guard fetches status and shows denial when closed (one extra call). Plan assumes always-redirect.

---

## Design

### 1. `getApplicationDetailUrl` — add optional programId context
`utilities/fundingPlatformUrls.ts`
```ts
getApplicationDetailUrl(communityId, referenceNumber, whitelabelOrigin?, opts?: { programId?: string; tab?: string })
```
Appends `?programId=…` (+ `&tab=…`) when provided. Backwards-compatible (no change for existing callers). Satisfies Mahesh's programId-context request without moving the grantee off `/applications/:ref`.

### 2. `buildGranteeRedirect` — redirect to the URL's ref, not only the single-app case
`utilities/fundingPlatformUrls.ts:179`
- Add a variant `buildManageEscapeRedirect({ communityId, referenceNumberFromUrl, programId, whitelabelOrigin })` that always targets `getApplicationDetailUrl(communityId, referenceNumberFromUrl, whitelabelOrigin, { programId })`.
- Keep existing `buildGranteeRedirect` (used by `ManageDeniedView`) for the "no ref in URL" list/setup pages, but drop the hard `applicationCount === 1` gate → when multiple, still send to their own single most-recent, or the applications list.

### 3. Guard: redirect denied non-reviewers instead of the red box
`src/core/rbac/components/funding-platform-guard.tsx`
- Add opt-in prop: `<FundingPlatformGuard onDeniedRedirectTo={target}>`.
- On resolved denial (`!isLoading && !isGuestDueToError && !hasAccess`), `router.replace(target)` and render a spinner (never the red box, never a denial flash).
- `programId` + `:ref` come from `useParams()` (already available on these routes). Whitelabel origin from `useWhitelabel()`.
- Preserve `useIsFundingPlatformAdmin` / `useIsFundingPlatformReviewer` exports.

### 4. Wire the three manage routes
- `…/applications/[applicationId]/page.tsx` → pass `onDeniedRedirectTo={getApplicationDetailUrl(communityId, applicationId, wlOrigin, { programId, tab })}`.
- `…/milestones/[projectId]/page.tsx` → redirect target resolved via `useGranteeApplicationAccess({ programId })` + `{ tab: "milestones" }`.
- `…/applications/page.tsx` (list) → `getBrowseApplicationsUrl(communityId, programId, wlOrigin)` for public / own list for applicants.

### 5. Public page honors programId + tab (mostly already true)
- `?tab=milestones` already works via `useUrlTabState()`.
- Accept `?programId=` as a disambiguator in `fetchAppWithProgram` (prefer `(programId, ref)` when both present; fall back to ref-only for old links). No path change.

---

## Out of scope for Phase 1
- **Folding the reviewer view *into* `/applications/:ref`** (rendering review controls inline, then 308-ing the manage URL). The guard redirect makes `/manage` optional *for applicants*; converting reviewers over is a later step and must keep `/manage` alive until the inline reviewer view is proven. Do **not** 308 the manage detail URL in this phase.
- **Payouts / Financials** — Mahesh: skip (redesign pending).
- **Reports / milestones-report / workspace** — "clean up URL" sweep, separate PR (delete `PAGES.REVIEWER.*` alias, merge report preview↔public URL, fix `programId` raw-vs-parsed + community UID-vs-slug drift).

---

## Test plan
- **Unit:** `getApplicationDetailUrl` programId/tab appending; `buildManageEscapeRedirect` targets (whitelabel + karmahq hosts); guard redirect fires only on resolved denial, never on loading/guest-due-to-error.
- **Redirect matrix tests:** for each of the 3 routes × {reviewer, applicant-own, applicant-other, logged-out}, assert render-vs-redirect and the exact target URL incl. `?programId=` and `?tab=`.
- **E2E (preview, both hosts):** flows 1–8 above, including at least two failure paths (private app → sign-in; applicant with zero apps in program → fallback).

---

## Open questions (for Bruno / Mahesh)
1. **"Open" semantics** — always-redirect and let the page gate (assumed), or guard checks application status and shows denial when closed?
2. **Ref uniqueness** — confirm `APP-…` refs are globally unique; if not, `?programId=` becomes load-bearing for correctness, not just context.
3. **Milestones for a pure-public viewer** (no application in the program) — redirect to the public grant page, or the community updates feed?
