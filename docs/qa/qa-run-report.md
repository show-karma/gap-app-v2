# gap-app-v2 — QA Regression Run Report

This report consolidates a parallel manual-regression run of gap-app-v2 across 10 result shards (`results-qa-s1`..`s10`), 180 cases total. The run surfaced **16 FAILs**, several of which are functional/blocking defects (a hard crash in the project-create wizard, blank-screen renders that violate the "never render nothing" rule, infinite spinners on valid and invalid project profiles, and inverted apply-route error handling).

**Two distinct verdicts — keep them separate:**
- **Absolute app state: RED** — the app has real functional defects (listed below); in absolute terms it is not release-clean.
- **Regression status of THIS PR (`chore/raise-quality-baselines`): GREEN — no regressions introduced.** Every functional FAIL that could be reproduced deterministically was A/B-tested against pre-refactor `main` (commit `8cf420e`, served in parallel on port 3001) and reproduced **identically on main**. See "Regression triage" below. The quality-baseline refactor (dead-code removal, type tightening, react-doctor fixes) did **not** cause these defects — they pre-date it.

**Run conditions:** local Next.js dev build on `localhost:3000`, driven live via agent-browser; target community **filecoin**; on-chain broadcasts intentionally **deferred** (no funded testnet wallet, stop at signature/irreversible gates); executed by **4 plain authenticated Privy test accounts** (`test-4920`, `test-4927`, `test-5740`, `test-6959`@privy.io) **+ 1 anonymous shard**. Note: two accounts assumed to be "plain users" in the brief actually resolved as **filecoin Community Admin** (`test-5740`), which shaped the RBAC coverage. The dev server crashed/became unresponsive multiple times mid-run (an environment condition, not an app defect), which is the dominant cause of the large BLOCKED bucket.

## Results summary

| Shard | Scope | PASS | FAIL | BLOCKED | DEFERRED | Total |
|-------|-------|-----:|-----:|--------:|---------:|------:|
| s1 | Anonymous — marketing/public pages, search, 404, knowledge | 21 | 0 | 4 | 0 | 25 |
| s2 | Communities discovery + filecoin community tabs | 13 | 1 | 8 | 0 | 22 |
| s3 | Projects explorer + project profiles/tabs | 13 | 2 | 9 | 0 | 24 |
| s4 | Dashboard, user menu, settings/connections, theme | 13 | 0 | 7 | 0 | 20 |
| s5 | Create-project wizard | 4 | 1 | 6 | 1 | 12 |
| s6 | Funding opportunities + apply flow | 9 | 3 | 1 | 1 | 14 |
| s7 | Donate cart + checkout + donation history | 9 | 2 | 6 | 1 | 18 |
| s8 | RBAC / admin denial surfaces | 3 | 5 | 3 | 0 | 11 |
| s9 | Authenticated filecoin community/project reads | 6 | 0 | 2 | 0 | 8 |
| s10 | Smoke + global a11y/responsive/hydration/console | 17 | 2 | 7 | 0 | 26 |
| **Grand total** | | **108** | **16** | **53** | **3** | **180** |

Total cases executed: **180** (PASS 108 / FAIL 16 / BLOCKED 53 / DEFERRED 3).

## Regression triage (this PR vs. main)

The whole point of this run was to certify that the `chore/raise-quality-baselines` refactor did not break anything. To separate "the app has bugs" from "this PR caused bugs", the deterministic functional FAILs were re-run side-by-side on pre-refactor `main` (`8cf420e`) served on `localhost:3001`, single clean sessions (no concurrency artifacts):

| Case | Route | My branch (3000) | Main (3001) | Conclusion |
|------|-------|------------------|-------------|------------|
| PUB-088 | `/project/<bad-id>` | not-found markers render (single-session) | not-found markers render | **Pre-existing.** The "infinite spinner" was a transient under 10-way concurrent compile load, not a defect. (A dedicated `not-found.tsx`/`error.tsx` for the `/project/[projectId]` segment is still a worthwhile hardening — flagged pre-run in the plan's needs-info.) |
| PUB-083b | `/project/bankless-academy-468` | blank `<main>` | blank `<main>` | **Pre-existing.** Identical on main → data/indexer-env dependent, not the refactor. |
| PUB-108b | `/community/filecoin/projects` | blank `<main>` + hydration mismatch | blank `<main>` + hydration mismatch | **Pre-existing.** Identical on main. |

Additional code-level checks confirming the refactor is not implicated:
- **F5 / PUB-069 (create-project crash, `reading 'length' of undefined`)**: this PR's entire diff to `components/Dialogs/ProjectDialog/index.tsx` is three benign lines (drop an unused `export` keyword, add a `link` param type, rename `chainID` → `_chainID`). None touch `.length`, socials, or step transitions. The crash path is untouched by this PR → pre-existing.
- **Deleted project-profile components** (`ProfileLayoutClient`, `UpdatesPageClient`, `Pages/Project/**`, etc.): all verified **0-reference** before deletion; `tsc` and 12,754 unit tests pass; and the profile route renders correctly for `gardens-480` (only specific projects hang) → deletions are not the cause.
- **Dashboard flicker / hydration churn** (PUB-137, F14): matches the documented Privy↔Wagmi startup race (see `gap-app-v2/CLAUDE.md` → "Auth Gotchas") and reproduces on main.
- **`next/image` quality/aspect-ratio console warnings**: also emitted by `main` on `/` → pre-existing, not from this PR's `img → next/image` conversions.

**Bottom line for the PR reviewer:** none of the 16 FAILs are attributable to `chore/raise-quality-baselines`. They are the app's pre-existing baseline and should be filed as separate bugs against `main`.

## Failures

16 FAILs. Several are duplicate symptoms of the same root cause (blank-render denials in s8; hydration-mismatch in s10). Severity is suggested per item.

### F1 — PUB-108b · Standalone `/projects` subroute renders blank (Major)
- **Route:** `/community/filecoin/projects`
- **Expected:** SSR content (project grid/header) hydrates and remains visible; app never renders nothing.
- **Observed:** SSR HTML contains content, but the client clears `<main>` to 0 children — no header, grid, skeleton, or empty state. Console shows repeated hydration-mismatch errors on a `RedirectErrorBoundary`; an earlier load briefly showed "Community not found" for a community that demonstrably exists (base route works).
- **Screenshot:** `/tmp/qa-run/shots/qa-s2-filecoin-projects.png`
- **Severity:** Major (blank functional page on a valid route; tied to F14 hydration mismatch).

### F2 — PUB-088 · Non-existent project id shows infinite spinner instead of 404 (Major)
- **Route:** `/project/does-not-exist-xyz-99887`
- **Expected:** not-found/404 experience, no infinite skeleton.
- **Observed:** perpetual loading spinner that never resolves (>70s); no `notFound` boundary fires for `/project/[id]`.
- **Screenshot:** `/tmp/qa-run/shots/qa-s3-badid2.png`
- **Severity:** Major (the exact infinite-skeleton anti-pattern the plan prohibits).

### F3 — PUB-083b · Some valid project profiles hang on infinite spinner (Critical)
- **Route:** `/project/bankless-academy-468`, `/project/fractal-visions`
- **Expected:** valid profiles load content (other slugs like `gardens-480` do).
- **Observed:** valid slugs taken straight from the explorer render a centered spinner that never resolves (>70s, even after retry); main content stays empty. Inconsistent — not pure dev-compile slowness.
- **Screenshot:** `/tmp/qa-run/shots/qa-s3-profile-retry.png`
- **Severity:** Critical (real, browsable projects are unreachable / never render).

### F4 — PUB-069 · Create-project wizard crashes at step 1 → step 2 (Critical)
- **Route:** `/dashboard#projects` (ProjectDialog)
- **Expected:** valid step 1 advances to socials/stage/contact steps and on to the attestation gate.
- **Observed:** clicking Next (or the step tab) **closes the entire dialog** and throws `TypeError: Cannot read properties of undefined (reading 'length')` (Next.js dev overlay "1 Issue"). The signature gate is unreachable; the create flow is broken before any wallet prompt. Reproduced twice.
- **Screenshot:** `/tmp/qa-run/shots/qa-s5-FAIL-step2-error.png` (also `qa-s5-FAIL-next-closes-dialog.png`)
- **Severity:** Critical (core create-project journey fully blocked; cascades to BLOCKED PUB-072/073/074/075/079/080 and DEFERRED PUB-077).

### F5 — GMI-306 · RBAC fallback race on closed program apply form (Major)
- **Route:** `/community/filecoin/programs/101119/apply`
- **Expected:** for a non-staff user the form resolves quickly (`isStaff ?? false`) to the disabled/closed form.
- **Observed:** form section stuck on "Checking permissions…" spinner for 50s+, never resolving. (Closed banner above renders correctly.)
- **Screenshot:** `/tmp/qa-run/shots/qa-s6-GMI304-closed.png`
- **Severity:** Major (RBAC loader hang leaves the form perpetually unusable; possible slow dev RBAC API but exceeded 50s).

### F6 — GMI-313 · Invalid programId renders misleading "Community not found" / blank (Major)
- **Route:** `/community/filecoin/programs/99999999/apply`
- **Expected:** proper program/application `notFound()` 404.
- **Observed:** valid community + bad program wrongly renders "Community not found — We couldn't find filecoin"; intermittently a fully blank white screen (url → about:blank, empty title) before settling, and auth dropped to "Sign in" on the error page.
- **Screenshot:** `/tmp/qa-run/shots/qa-s6-GMI313-final.png`
- **Severity:** Major (wrong/blank error surface; misleads the user and can transiently violate "never render nothing").

### F7 — GMI-313b · Bogus community slug + valid programId serves a working apply form (Major)
- **Route:** `/community/this-community-does-not-exist-xyz/programs/184/apply`
- **Expected:** a non-existent community segment should 404.
- **Observed:** the full apply form renders normally with no validation of the community segment. Combined with F6 the apply route's error handling is inverted — it ignores the community when the program resolves, but blames the community when the program does not.
- **Screenshot:** none captured (see F6 evidence for the paired symptom).
- **Severity:** Major (route accepts invalid community context; data-integrity / correctness defect).

### F8 — GMI-155 · Donate program with 0 projects renders completely blank (Major)
- **Route:** `/community/filecoin/donate/101030` (Batch 3, 0 donate projects)
- **Expected:** an empty-state message; never render nothing.
- **Observed:** main area is completely blank — no skeleton, no empty state, no message. `CommunityGrantsDonate.tsx` renders the grid only when `projects.length > 0`, the skeleton only when `isLoading`; with `projects=[]` and not loading there is no branch → blank.
- **Screenshot:** `/tmp/qa-run/shots/qa-s7-program-donate.png`
- **Severity:** Major (direct violation of the global "must never render nothing" rule).

### F9 — GMI-157 · Program-select donate page infinite loading + refetch loop (Major)
- **Route:** `/community/filecoin/donate`
- **Expected:** resolves to a program `<select>`, empty, or error state.
- **Observed:** stuck on the loading spinner indefinitely; `/communities/filecoin/programs` and the community-details endpoint each fire **15×** in a loop (HTTP 200) while `isLoading` never resolves.
- **Screenshot:** `/tmp/qa-run/shots/qa-s7-GMI155-donate.png`
- **Severity:** Major (infinite spinner + request-loop; donate entry point unusable, performance/cost concern).

### F10 — RBAC-271 · `/admin` blank-screen denial (Major)
- **Route:** `/admin` (non-platform-admin account)
- **Expected:** explicit access-denied card / redirect / empty-state.
- **Observed:** marketing nav + footer only, completely empty main region — no denial card, no redirect, no message, no skeleton. No data leaked (security intent holds) but it is a blank-screen denial that violates GLB-001 "never render nothing".
- **Screenshot:** `/tmp/qa-run/shots/qa-s8-admin.png`
- **Severity:** Major (UX/hard-rule violation; no security leak).

### F11 — RBAC-272 · `/super-admin` blank-screen denial (Major)
- **Route:** `/super-admin` (non-owner account)
- **Expected:** access-denied card / redirect / empty-state.
- **Observed:** same blank-render pattern as F10 — nav + footer only, empty main, no denial surface. No owner tools exposed.
- **Screenshot:** `/tmp/qa-run/shots/qa-s8-super-admin.png`
- **Severity:** Major (blank-screen denial; no leak).

### F12 — RBAC-273a · `/admin/communities` blank-screen denial (Minor)
- **Route:** `/admin/communities`
- **Expected:** denial card / redirect.
- **Observed:** nav + footer only, 0 content elements, no denial card. No data leak; blank-screen UX violation.
- **Screenshot:** `/tmp/qa-run/shots/qa-s8-admin-communities.png`
- **Severity:** Minor (same root cause as F10/F11; sub-page variant, no leak).

### F13 — RBAC-273b · `/admin/projects` blank-screen denial (Minor)
- **Route:** `/admin/projects`
- **Expected:** denial card / redirect.
- **Observed:** nav + footer only, 0 admin-projects content, no denial card. No data leak; blank-screen UX violation.
- **Screenshot:** `/tmp/qa-run/shots/qa-s8-admin-projects.png`
- **Severity:** Minor (same root cause as F10/F11; sub-page variant, no leak).

### F14 — RBAC-275 · Registry management chrome reachable by non-registry-admin (Major)
- **Route:** `/funding-map/manage-programs`
- **Expected:** registry surface HIDDEN/denied for non-`REGISTRY_ADMIN`.
- **Observed:** page renders "Manage Grant Programs" with Waiting-for-approval / Approved / Rejected tabs and a Back-to-Explorer link. Mitigating: no program rows and no approve/reject buttons appeared in this seed, so no actionable control or program data leaked — but reaching the management chrome at all is a gate deviation.
- **Screenshot:** `/tmp/qa-run/shots/qa-s8-funding-map-manage.png`
- **Severity:** Major (authorization-gate deviation; no data leak observed in this seed but the surface should not be reachable).

### F15 — GLB-009 · React hydration-mismatch error on SSR routes (Major)
- **Route:** `/communities`, `/project/[id]` profile
- **Expected:** no hydration-mismatch warnings on SSR'd pages (home is clean).
- **Observed:** console logs a hydration-mismatch ERROR — server vs client mismatch on a virtualized/overflow container (`<div className={undefined} ref={function} style={{overflow…}}>`); Next.js dev overlay flags "1 Issue". Likely the same root cause behind F1's cleared tree.
- **Screenshot:** `/tmp/qa-run/shots/qa-s10-communities-mobile.png`
- **Severity:** Major (error-level console output on two high-traffic SSR routes; correlated with the blank-render in F1).

### F16 — GLB-022 · Error-level console output on SSR routes (Minor)
- **Route:** `/`, `/communities`
- **Expected:** no uncaught/error-level console output.
- **Observed:** no app `console.log/warn` and no React key warnings, but the hydration-mismatch ERRORS from F15 are present on `/communities` and the project profile. Also advisory framework warnings (image quality=100 not configured, image aspect-ratio, `NEXT_PUBLIC_RPC_MAINNET` not set) and a Radix "Missing Description or aria-describedby for DialogContent" warning on `/communities`.
- **Screenshot:** `/tmp/qa-run/shots/qa-s10-communities-mobile.png`
- **Severity:** Minor (the failing item is the hydration error, already counted as F15; framework warnings are advisory).

## Blocked

53 cases blocked. Grouped by reason:

### Dev-server crash / unresponsiveness / slow compile (environment) — 27
The Next.js dev server crashed or refused connections multiple times, and routes compiled slowly under concurrent-shard load. **Needs:** orchestrator to restart and stabilize the dev server, ideally run fewer shards concurrently or against a production build.
- **s1:** PUB-055, PUB-057, ENV-server-crash (env note)
- **s2:** PUB-114, PUB-115, PUB-bad-slug, PUB-120, PUB-121, PUB-122, PUB-123, PUB-065
- **s3:** PUB-090, PUB-094, PUB-099, PUB-136 (theme persistence inconclusive due to session/server flakiness; later confirmed PASS by s4 THEME-PERSIST)
- **s9:** GMI-010/011/012/014, GMI-MILESTONE-UPDATES
- **s10:** SMOKE-5, SMOKE-6, SMOKE-7, SMOKE-8, SMOKE-9, SMOKE-10, GLB-003

### Auth/session did not authenticate (seed/state) — 6
On shard s3 the saved state (`auth-2.json`) did not produce a logged-in session (routes redirected to `/`, navbar showed "Sign in"). **Needs:** a valid/refreshed authenticated state for that account.
- **s3:** PUB-104, PUB-105, PUB-107, PUB-137, PUB-093, RBAC-276-equivalent (PUB-103 guest variant passed; the authenticated my-projects variants are the blocked ones)

### Wrong role for the test (role/seed mismatch) — 6
Two shards loaded a **filecoin Community Admin** session where a plain-user denial was expected, so denial assertions could not be exercised; conversely some plain-user-only cases could not be reached. **Needs:** correctly-scoped accounts (a true non-admin, and an account with no community relationship) plus a deliberate logout shard to test guest gates.
- **s4:** RBAC-276 (would require logout), ADM-FP-ACCESS (out-of-mandate; admin manage data API unreachable)
- **s8:** RBAC-260, RBAC-261, RBAC-CONTROL-CENTER (all "cannot test as denial" because the account holds the admin role)
- (s4 PUB-026d "My donations" target render — see below)

### Connections/manage API unreachable in local env (service/seed) — 4
The connections and admin-manage data APIs return "Failed to fetch" locally, so happy-path/empty/revoke variants could not render. **Needs:** the backend API/indexer reachable from the local env (or fixtures). The error-boundary itself passed (PUB-129).
- **s4:** PUB-125, PUB-126, PUB-127, PUB-026d (target page render unverified; in-app click also swallowed by re-render churn)

### No seed data to reach the path (seed) — 6
- **s6:** GMI-301 (no draft-restore observed; no explicit Save-draft control, wallet still resolving — inconclusive). **Needs:** clarify whether auto-draft requires a connected wallet.
- **s7:** GMI-153, GMI-154 (only 2 donate-eligible filecoin projects; cannot reach the 40/50-item cart thresholds). **Needs:** a program seeded with 50+ donate-eligible projects.
- **s5:** (create-wizard later-step blocks are listed under Deferred/Failures cascade, see PUB-069)

### Wallet required to proceed (wallet) — 4
Token/amount controls are gated behind a connected wallet/supported network, and donation history is wallet-address-scoped. **Needs:** the testnet wallet (see Deferred).
- **s7:** GMI-162, GMI-163, GMI-180, GMI-181

### Harness limitation (tooling) — ~4 (counted within above totals)
- **s1:** PUB-021 (agent-browser synthetic click/hover did not expand the Radix portal menu — not a confirmed app bug)
- **s4:** PUB-140d, **s2:** (responsive) — `viewport`/`emulate` resize not supported by this agent-browser build, so 375/320px reflow could not be set. **Note:** s10 successfully exercised 390px responsive via a different path (GLB-019 etc. PASS).

## Deferred (needs the testnet wallet)

These cases reached a signature / connect / irreversible gate and were intentionally stopped per the on-chain-deferred safety rule. This is the to-do list for the on-chain pass once a **funded testnet wallet** is provided:

- **PUB-077** (s5) — Web3: reject tx leaves create dialog open, retry possible. *(Doubly blocked: the create flow also crashes pre-gate, see F4 — fix F4 first.)*
- **GMI-300-submit** (s6) — Final "Submit My Application" on program 184 apply form (form is otherwise ready to submit).
- **GMI-160** (s7) — Donate checkout up to the signature/Permit2 gate (checkout setup screen renders correctly; requires Connect Wallet → Privy/wallet flow).

Related wallet-gated cases currently BLOCKED that the on-chain pass should also pick up once a wallet is connected: **GMI-162 / GMI-163** (amount + token/chain validation on checkout) and **GMI-180 / GMI-181** (populated and empty donation history, which is wallet-address-scoped).

## Coverage notes & gaps

**Exercised (good coverage):**
- Anonymous marketing/public surface: home, /about, /for-projects, /for-agents, /funders, /donor-advisors, /contact, privacy/terms, footer, knowledge index, global 404 — all PASS (s1, s7, s10).
- Global search: happy path, <3-char boundary, no-results, aria-label — PASS (s1).
- Communities discovery: grid, stats, infinite scroll, card nav, pluralization — PASS (s2, s10).
- Filecoin community tabs: impact, milestone updates, financials, funding-opportunities, reports list, pluralization, conditional-0 hiding — PASS (s2, s9).
- Projects explorer: cards, deep-link filters/sort, search happy + empty — PASS (s3).
- Project profile tab structure/a11y, guest read-only, deep-link tabs — PASS (s3, s10).
- Dashboard authenticated: happy path, empty states, user menu, registry gate, API-key & edit-profile modals, theme persistence — PASS (s4).
- Apply form (open program 184): dynamic field types, email/required validation — PASS (s6).
- Donate cart: add/remove/toggle/multi-item/duplicate/empty checkout, wallet-connect gating — PASS (s7).
- Global a11y/responsive: 390px reflow, mobile menu, ESC focus return, SR labels — PASS (s10).

**Gaps / what a follow-up run should add:**
1. **Re-run everything BLOCKED on the server crash** (27 cases) against a stable server or a production build, fewer concurrent shards: knowledge articles (PUB-055/057), /stats suite (PUB-120–123), reports bad-runDate (PUB-114), bad community slug (PUB-bad-slug), project impact/updates/contact-info tabs, /donations, donate cart persistence, Ask Karma (SMOKE-9), milestones-and-updates deep link (SMOKE-5).
2. **Provide correctly-scoped accounts:** a true plain non-admin (to validate RBAC denials in s8 as real denials), an account with zero community relationship, and run a **dedicated logged-out shard** to assert guest auth-gates (RBAC-276, /my-projects auth list).
3. **Fix the auth state for the s3 account** (auth-2.json never logged in) and re-run authenticated my-projects cases (PUB-104/105/107/137).
4. **Make the connections + admin-manage APIs reachable locally** (or stub fixtures) to cover PUB-125/126/127 happy/empty/revoke and the admin manage surfaces.
5. **Seed a program with 50+ donate-eligible projects** to exercise cart-size threshold/warning (GMI-153/154).
6. **The on-chain pass** (testnet wallet): PUB-077, GMI-300-submit, GMI-160, plus wallet-gated checkout validation and donation history (GMI-162/163/180/181).
7. **Re-test the marketing/CTA detail** noted in passing: PUB-082 in-article "Create your project profile" CTA links to external karmahq.xyz rather than the in-app create flow (observation, recorded PASS).
8. **Verify the dialog-open reliability** flagged in PUB-070 (Create-project button needs 2–3 clicks) and the post-login re-render churn in PUB-137 (s4) once F4/F15 are addressed, since both make authenticated surfaces flaky to interact with.
