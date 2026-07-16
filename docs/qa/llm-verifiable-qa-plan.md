# PR #1637 — LLM-Verifiable Full QA Plan (post-merge certification)

**Scope**: certify the merged tree of `chore/raise-quality-baselines` after syncing 122 commits
from `main` (merge commit `cdfb7561`). The PR's delta touches ~1,540 files: knip dead-code
removal, biome autofixes, react-doctor error/warning fixes (a11y, perf, router, keys, types),
test repairs, and ~40 hand-resolved merge conflicts against main's newest features (dashboard
bento v3, portfolio-report type filter, notes tab, SSR fetch retry, signer-error handling).

**How this differs from `manual-regression-plan.md`**: that plan is a *human* certification
checklist. This plan is written so an **LLM agent driving a real browser with an authenticated
user can execute and verify every check mechanically**, and so a human reviewing the run can
trust the verdicts without re-running them.

---

## 1. Trust contract (what makes an LLM verdict trustworthy)

Every check in this plan obeys five rules. A run that violates any of them is invalid.

1. **Falsifiable predicate, no judgment calls.** Each check's PASS condition is a concrete,
   observable predicate (exact text, selector, URL, HTTP status, console pattern) — never
   "looks correct" or "renders properly". If the predicate is not observed, the verdict is
   FAIL or BLOCKED, never a softened PASS.
2. **Evidence or it didn't happen.** Every verdict (PASS and FAIL alike) must cite captured
   evidence in the run report: the matched DOM text/selector, the request URL + status code,
   the console output, and a screenshot saved under `docs/qa/evidence-<run-date>/<ID>.png`.
   A verdict without evidence is treated as NOT RUN.
3. **Independent signals.** A page-level PASS requires all three channels to agree:
   DOM (expected content present), network (no failed request that the page depends on),
   console (no uncaught errors). One channel cannot vouch for another.
4. **Deterministic data or recorded data.** Where a check depends on seed data (e.g. "a
   program with 0 applications"), the run report must record *which* entity was used
   (slug/id), so the check is re-runnable against the same target.
5. **Non-determinism is triaged, not retried into silence.** A check that passes on retry
   after a failure is recorded as FLAKY with both traces — not PASS. (Dogfood/verdict
   non-determinism has produced false positives before; see memory of PR 1766/1821.)

**Verdicts**: `PASS` / `FAIL` / `BLOCKED` (environment or seed data missing — say what) /
`FLAKY` (passed only on retry) / `DEFERRED` (signature/on-chain gated — see §6).

---

## 2. Session bootstrap (run once per run)

- **Build under test**: run against a production build (`pnpm build && pnpm start`) or the
  Vercel preview of this PR — not the dev server (dev-only warnings and turbopack chunk
  caching have produced false QA signals before). Record the commit SHA and origin URL.
- **Port**: if local, serve on an allowlisted Privy port (3000–3011; 3005 is the fallback).
- **Login (once)**: Privy email login with the QA fixture account — email `$QA_TEST_EMAIL`,
  fixed OTP `$QA_TEST_OTP` (enter OTP digit-by-digit). Save browser storage state after login
  and reuse it for all subsequent checks (origin-scoped).
- **Roles**: the fixture accounts collapse to one indexer user with project-owner +
  community-admin + reviewer surfaces. Record which account was used. Checks marked
  `[admin]` need the community-admin role on the target community; `[owner]` needs a
  project the account owns.
- **Console/network taps**: attach console + network capture *before* first navigation on
  every page inspected.

---

## 3. Global invariants — run on EVERY route in §4/§5

These encode the app-wide rules the quality sweep touched (three-states, pluralization,
empty-state hiding, a11y). For each route visited, assert all of:

| ID | Invariant | PASS predicate |
|----|-----------|----------------|
| GI-1 | No uncaught console errors | console capture contains zero `error`-level entries, excluding known-benign Privy `analytics_events` 403 |
| GI-2 | No failed page-critical requests | no request the page rendered from returned 5xx; no 4xx except expected auth-gates (record any 4xx seen) |
| GI-3 | No infinite skeleton | within 15s the route shows data, a purpose-built empty state, or an error state with retry — never a skeleton forever and never a blank region |
| GI-4 | No React key warnings | console has no "unique key" warnings (keys were rewritten across the PR) |
| GI-5 | No hydration mismatch | console has no hydration/mismatch warnings |
| GI-6 | No broken pluralization | page text has no singular/plural mismatch matching `/\b1 [a-z]+s\b/` (e.g. "1 teams", "1 reports") and no `"0 "`-prefixed block that should be hidden |
| GI-7 | No leaked placeholders | page text contains no `undefined`, `NaN`, `[object Object]`, `null` rendered as visible copy |
| GI-8 | Page has exactly one `h1` | `document.querySelectorAll('h1').length === 1` (sr-only counts) |

How to verify: after each navigation, run one DOM-snapshot + one JS eval for GI-6/7/8, read
console (GI-1/4/5), read network (GI-2). Cite counts in the report.

---

## 4. Priority 1 — merge hot-spots (hand-resolved conflicts; highest regression risk)

These map 1:1 to the files where main's features and this PR's refactors collided. Each is a
user story with a mechanical verification.

### V-101 Dashboard bento (Dashboard.tsx, DashboardLoading, v3 modules, donorReportsQueryKey)
*As an authenticated user I see my role-aware dashboard.*
1. Navigate to `/dashboard`.
2. PASS: bento module grid renders (≥1 tile with an accessible name); welcome header present;
   GI-1..8 clean. While loading, skeleton tiles (not a blank page) were visible.
3. Drill into one module (click a tile) → full view opens, admin banner hides; navigate back.
4. Specifically watch console for errors from `useAdvisorData` (imports the restored
   `donorReportsQueryKey`) — any error mentioning `donorReports` is FAIL.

### V-102 Portfolio reports admin list (type filter ✕ destructured router) `[admin]`
*As a community admin I filter, preview, edit and delete portfolio reports.*
1. Navigate to `/community/<slug>/manage/portfolio-reports` on a community with ≥2 reports
   of ≥2 config types.
2. PASS predicates:
   - count line reads `N report`/`N reports` correctly pluralized (GI-6);
   - type-filter select renders **only if** >1 distinct type exists;
   - choosing a type with 0 reports renders "No reports of this type." + a "Show all reports"
     button that restores the list;
   - **Edit** navigates to `/community/<slug>/manage/portfolio-reports/<id>` (this wiring was
     re-pointed from `router.push` to the destructured `push` in conflict resolution — a
     broken handler = silent no-op, so assert the URL actually changed);
   - **Preview** navigates to the public `/community/<slug>/reports/<runDate>/<configSlug>` route;
   - **Delete** opens a confirmation dialog (do not confirm).
3. URL filter state survives reload (nuqs `?type=`).

### V-103 Milestones review back-link (`applicationDetailUrl`) `[admin]`
*As a reviewer/admin I return from milestone review to the application.*
1. From an approved application's Milestones tab, open the milestones review screen with
   `?referrer=application`.
2. PASS: "Back to Application" link is present and its `href` resolves to the application
   detail page for the same reference number; clicking it lands there (URL assert).

### V-104 Application detail tabs incl. Notes (TAB_ICONS/constants, ApplicationTabKey) `[admin]`
*As an admin I move between application tabs; the private Notes tab exists for me only.*
1. Open a whitelabel application detail page as admin.
2. PASS: tab bar renders Details / Milestones (if approved) / Comments, each with an icon
   (SVG present inside each tab button); **Notes** tab present with lock icon for the admin
   session; clicking each tab switches the panel and updates the `?tab=` URL param.
3. Re-open the same URL in a logged-out context: Notes tab absent (RBAC).
   (The `notes` key was hand-ported into two constants files during conflict resolution —
   a miss renders no icon or crashes the tab bar; both are DOM-assertable.)

### V-105 Application KYC card (restored `status-config` + `getEffectiveKycStatus`) `[admin]`
*As an admin I see the applicant's KYC state on the application page.*
1. On an application with KYC configured, locate the KYC card.
2. PASS: card shows a status badge whose label is one of the known set (Not started /
   Pending / Approved / Rejected / Expired) and a description line; zero console errors
   referencing `status-config` or `getEffectiveKycStatus`.

### V-106 Milestone form (control/schema extraction) `[owner]`
*As a project owner I create a grant milestone with validation.*
1. Open the create-milestone form on an owned grant.
2. PASS predicates:
   - title <3 chars → exact schema message under the field; >50 chars → max message;
   - **priority popover** opens and selects a value (this Controller's `control` wiring was
     the conflict — a regression renders a dead popover);
   - set start date after end date → "Start date must be before the end date" appears under
     the **start** date (the `path` fix this PR locks with a schema test);
   - submit stays blocked until valid.
3. Do not sign the attestation (→ §6).

### V-107 Unified milestone screen (connectWallet / chainName / OVERVIEW redirect) `[owner]`
*As a project owner the milestone dialog guides me when my signer isn't ready.*
1. Open the unified milestone creation dialog from a project with ≥1 grant.
2. PASS: with the form valid but signer unavailable, the submit renders the Connect-wallet
   CTA (AttestationSubmit) and clicking it invokes the Privy connect flow (modal appears) —
   this exercises the re-added `connectWallet` binding. No `chainName is not defined`
   console error at any point.
3. Full attest + redirect-to-Overview: DEFERRED to §6. Static half: assert (code-level, see
   §7) that post-success navigation targets `PAGES.PROJECT.OVERVIEW`, not `UPDATES` — same
   for ProjectObjective / ProjectObjectiveCompletion forms.

### V-108 Project updates tab (ProjectUpdateCard, normalizeProofUrl, stable keys)
*As a visitor I read a project update's deliverables and open proof links.*
1. Open a project with an update that has deliverables (record which).
2. PASS: each deliverable renders name + description; every proof link's `href` starts with
   `http` (bare domains get `https://` prefixed — assert via DOM attribute, not by clicking);
   GI-4 (no key warnings) on this page specifically.

### V-109 Project team tab (TeamMemberCard next/image copy button)
*As a visitor I copy a team member's address.*
1. Open a project's Team tab (v2 profile).
2. PASS: each member card shows the copy button whose image loaded
   (`/icons/copy-2.svg` → naturalWidth > 0 or `_next/image` 200 in network log); with a
   clipboard stub installed, clicking sets the clipboard to the member address.

### V-110 Markdown editor (SafeMdEditor sole importer)
*As an owner I write markdown in any form (project update, milestone description).*
1. Open a form containing the markdown editor.
2. PASS: editor mounts lazily (a loading placeholder first is acceptable), typing updates the
   value, no console error, and the initial page load of the route did **not** download the
   `md-editor-rt` chunk before the editor was needed (network log: chunk requested only
   on/after editor mount).

### V-111 Projects explorer (aria-label + filters)
*As a visitor I filter the projects explorer.*
1. Navigate to `/projects`.
2. PASS: a control with `aria-label="Filter to projects raising funds"` exists (exact string
   from main's a11y improvement); toggling it changes the result set and the URL; program
   filter skeletons (`FilterByProgramsSkeleton`) appear during load rather than a blank rail.

### V-112 Community funding programs (EditorialProgramCard helpers + isEnabled fix)
*As a visitor I browse a community's funding programs.*
1. Open a community funding page that has: an open program, a closed/disabled program, and
   (if seedable) one ending within 7 days.
2. PASS: the disabled program's card reads closed (never "Open" while it sits in the Ended
   tab — this exact fix was ported into the extracted helper); a program ending in N days
   shows a correctly pluralized "N day(s)"; no urgency copy rendered with a 0 count (GI-6).

### V-113 Project dialog signer-error path `[owner]`
*As an owner, submitting the project form with an unavailable signer guides me instead of
failing silently.*
1. Open the edit-project dialog on an owned project; make a trivial change; submit with the
   wallet disconnected.
2. PASS: a signer-unavailable message + reconnect affordance appears (from
   `useSignerErrorHandler`); the dialog preserves the form data; no generic error toast, no
   Sentry-visible crash, no silent success.

### V-114 fetchData retry/401 self-heal (behavioral smoke)
*As an authenticated user my data loads even when the first token is stale.*
1. Covered primarily by unit tests (`__tests__/utilities` fetchData/fetchRetry suites must be
   green — cite the test run).
2. Browser smoke: on a fresh login, walk Dashboard → a project page → an admin page and
   assert the network log shows **no request that terminally failed with 401** (a single 401
   followed by a successful retry of the same URL is the designed self-heal and counts PASS;
   a 401 with no successful retry is FAIL).

### V-115 Homepage & auth bridge (privy-bridge walletsReady)
*As a visitor I load the homepage and log in.*
1. Logged-out: `/` renders hero + sections; GI-1..8; axe suite for the homepage is green in
   the unit run (cite).
2. Log in via Privy fixed-OTP: navbar reflects the authenticated user; no sign-out loop
   within 60s of idling (the Privy↔Wagmi race rule); `walletsReady` shape test
   (`privy-bridge-trust`) green in the unit run (cite).

### V-116 Deleted-surface sweep (knip removals must leave no dead links)
*As a user I never reach a route or control that points at removed code.*
1. Visit: `/admin` (Admin index was deleted → whatever replaced it must resolve),
   grant milestones & updates screens (Updates/VerifyDialogs/MilestoneDelete were deleted),
   a project impact tab (VerifyImpactDialog deleted), projects search (SearchBar deleted).
2. PASS: every route above renders its current UI with GI-1..8 clean — i.e. main's newer
   components fully own these surfaces and nothing imports the deleted files (also locked by
   the green typecheck, cite the CI run).

---

## 5. Priority 2 — domain sweeps (breadth over the 1,540-file surface)

For each route below: run GI-1..8, exercise the primary interaction listed, capture evidence.
These cover the directories with the highest touched-file counts (hooks 72, utilities 56,
Admin 38, ApplicationView 31, Dashboard/v3 23, donor-rewards 15, funding-map 12, Donation 10,
payout-disbursement 9, navbar 9, QuestionBuilder 8, ProgramRegistry 8).

| ID | Route / surface | Primary interaction to exercise |
|----|-----------------|--------------------------------|
| V-201 | `/` + navbar + footer | open mobile menu at 375px; all nav links resolve (no 404) |
| V-202 | `/projects` + a project Overview | pagination/infinite scroll; project cards link correctly |
| V-203 | Project → Grants → a grant → Milestones & Updates | expand a milestone; verify badges/states render for mixed statuses |
| V-204 | Project → Impact | impact list renders; add-impact CTA gated to owner |
| V-205 | Project → Updates | update feed renders (UpdateCard on public tab) |
| V-206 | Community page (`/community/<slug>`) + Impact tab | tab switch; charts/indicators load or show empty state |
| V-207 | Community admin: milestones review list `[admin]` | filter by status; row click opens review |
| V-208 | Community admin: question builder `[admin]` | add a question, reorder, save; reload persists |
| V-209 | Funding platform: applications list `[admin]` | status filter; pagination >25; export if present |
| V-210 | Funding platform: application detail — comments tab `[admin]` | post a comment (markdown input is a touched file); it appears without reload |
| V-211 | Funding map / program registry | search a program; details dialog opens (touched file) |
| V-212 | Donor rewards surfaces | open donor rewards page; card grid renders; no chat-FAB overlay swallowing clicks (z-index gotcha) |
| V-213 | Donation flow up to wallet gate | build a cart, reach checkout, stop before signing (§6) |
| V-214 | Payout / disbursement admin `[admin]` | table renders; destructive actions show confirm dialogs |
| V-215 | `/dashboard` deep links (`#` anchors) | hash deep-link scrolls to section after load |
| V-216 | Whitelabel tenant smoke | on tenant host: `/` is community homepage (no redirect-to-login), applications flow reachable, no cross-tenant data |
| V-217 | 404s | bad project id / community slug / application id → real not-found UI (record HTTP status; the app-wide soft-404 = HTTP 200 is a KNOWN pre-existing issue — do not fail the PR for it, but record it) |
| V-218 | Faucet / scanner / other standalone apps if enabled | route loads, GI sweep only |

---

## 6. Signature/on-chain-gated checks (DEFERRED tier)

Everything requiring a real signature or funded wallet follows the existing
`docs/qa/onchain-qa-plan.md` staging protocol. In *this* run they are verified **up to the
gate**: the UI must reach the exact signer boundary (CTA enabled, correct chain prompt,
correct payload preview) and then stop. Applies to: project create/edit attestation
(V-113 full path), milestone attest + post-success **redirect to project Overview**
(V-106/107 full path), objective completion redirect, grant completion, endorsements,
donation execution (V-213), disbursement proposals. Note: gasless (ZeroDev) is broken on
staging — use an external wallet when the on-chain pass happens.

---

## 7. Non-browser verifiables (cite, don't click)

These are part of the same certification and must be attached to the run report:

| ID | Verifiable | PASS predicate |
|----|-----------|----------------|
| S-1 | `pnpm typecheck` | exit 0 on the merged tree |
| S-2 | `pnpm lint` | exit 0 (warnings allowed, errors none) |
| S-3 | `pnpm test` (unit project) | exit 0; cite total/passed counts; homepage-a11y, privy-bridge-trust, Milestone.schema, fetchData suites specifically green |
| S-4 | `pnpm quality` | exit 0 against the regenerated baseline; **react-doctor errors = 0** (the PR's headline gate) |
| S-5 | Redirect constants | `grep` shows post-attest redirects use `PAGES.PROJECT.OVERVIEW` in ProjectObjective, ProjectObjectiveCompletion, UnifiedMilestoneScreen (main's behavior kept) |
| S-6 | No stray conflict markers | `git grep -l '<<<<<<<\|>>>>>>>' -- '*.ts' '*.tsx' '*.json'` is empty |
| S-7 | CI on the PR | all required checks green after push (quality-gate ratchet needs the fresh baseline commit; a stale baseline-guard run needs a fresh push, not a rerun) |

---

## 8. Run protocol

1. Execute §7 first (cheap, machine-checkable) — abort the browser run if S-1..S-4 fail.
2. Boot the session per §2; record SHA, URL, account.
3. Run §4 in order (highest risk first), then §5. Login once, fan out; keep ≤4–6 parallel
   pages; auth storage state is origin-scoped.
4. Produce `docs/qa/qa-run-report-<date>.md` with: one row per ID → verdict, evidence paths,
   entity ids used, and a FLAKY/BLOCKED triage section. Every FAIL gets a GitHub issue in
   `show-karma/gap-app-v2` referencing the check ID.
5. Sign-off requires: S-1..S-7 PASS, all §4 checks PASS (or FAIL triaged as pre-existing
   with evidence from a `main` deployment showing the same behavior), §5 GI sweeps clean,
   §6 items explicitly listed as DEFERRED with their gate-level checks PASS.

**Pre-existing vs regression**: when a §4/§5 check fails, re-run the identical steps against
production (gap.karmahq.xyz) or a main-branch preview. Same failure there → record
"pre-existing, not this PR" with both screenshots; different behavior → regression, blocks
sign-off.
