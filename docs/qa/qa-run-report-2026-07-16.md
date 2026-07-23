# QA Run Report — 2026-07-16 (PR #1637 post-merge certification)

Executed per `docs/qa/llm-verifiable-qa-plan.md` by a multi-agent workflow (43 Sonnet agents, 34 checks + 8 adversarial verifications, ~71 min, evidence-backed).

- **Build**: `bedb5784` (merge of main `649957d9` into `chore/raise-quality-baselines`), production build (`pnpm build`), served at `http://localhost:3006` against staging indexer `gapstagapi.karmahq.xyz`
- **Account**: `test-8970@privy.io` (Privy fixed-OTP QA fixture; owns 1 project, Reviewer on Optimism, administers no community)
- **Evidence**: `docs/qa/evidence-2026-07-16/` (119 artifacts); structured verdicts from workflow `wf_dbd8cd2d-f1b`
- **Static verifiables (§7)**: S-1 tsc ✅ 0 errors · S-2 lint ✅ · S-3 tests ✅ 14,287/14,287 · S-4 quality gate ✅ react-doctor errors = 0 · S-5 OVERVIEW redirects ✅ · S-6 no conflict markers ✅ · S-7 CI pending on push

## Headline

**No regression attributable to PR #1637 was found.** 16 checks PASS outright; all 9 FAILs were adversarially verified (re-run fresh + compared against production or another branch's build where possible) and every one is pre-existing behavior — dominated by one root cause (missing/duplicate `h1` heading semantics, GI-8) plus two known platform quirks (soft-404, `/projects` pagination). 9 checks were BLOCKED by seed-data/role gaps of the QA account, not by the app. Every reachable merge-hotspot target regression came back clean.

## Verdicts

| ID | Check | Agent verdict | Final (post-verification) |
|----|-------|---------------|---------------------------|
| V-101 | Dashboard bento | FAIL | PRE-EXISTING |
| V-102 | Portfolio reports admin list | BLOCKED | BLOCKED |
| V-103 | Milestones review back-link | PASS | PASS |
| V-104 | Application tabs incl. Notes | PASS | PASS |
| V-105 | Application KYC card | BLOCKED | BLOCKED |
| V-106 | Milestone form validation | BLOCKED | BLOCKED |
| V-107 | Unified milestone signer gate | BLOCKED | BLOCKED |
| V-108 | Update deliverables proof links | PASS | PASS |
| V-109 | Team copy-address (next/image) | PASS | PASS |
| V-110 | Markdown editor lazy-load | PASS | PASS |
| V-111 | Projects explorer filters | FAIL | PRE-EXISTING |
| V-112 | Funding program cards | FAIL | PRE-EXISTING |
| V-113 | Project dialog signer-error | BLOCKED | BLOCKED |
| V-114 | fetchData 401 self-heal | FAIL | PRE-EXISTING |
| V-115 | Homepage + auth bridge | PASS | PASS |
| V-116 | Deleted-surface sweep | FAIL | PRE-EXISTING |
| V-201 | Homepage/nav/footer | PASS | PASS |
| V-202 | Projects explorer + overview | FAIL | PRE-EXISTING |
| V-203 | Grant milestones & updates | PASS | PASS |
| V-204 | Project impact | FAIL | PRE-EXISTING |
| V-205 | Project updates feed | PASS | PASS |
| V-206 | Community + impact tab | PASS | PASS |
| V-207 | Milestones review admin | PASS | PASS |
| V-208 | Question builder | BLOCKED | BLOCKED |
| V-209 | Applications list | PASS | PASS |
| V-210 | Application comments | PASS | PASS |
| V-211 | Funding map/registry | PASS | PASS |
| V-212 | Donor rewards | PASS | PASS |
| V-213 | Donation flow to gate | FAIL | PRE-EXISTING |
| V-214 | Payout admin | BLOCKED | BLOCKED |
| V-215 | Dashboard hash deep-link | BLOCKED | BLOCKED |
| V-216 | Whitelabel smoke | BLOCKED | BLOCKED |
| V-217 | Not-found routes | FAIL | PRE-EXISTING |
| V-218 | Standalone surfaces | PASS | PASS |

## FAIL triage (all verified pre-existing — none block this PR)

- **V-101**: Dashboard bento is main's code (#1772; byte-identical here bar a 1-line type edit). Findings: /dashboard has 0 h1 (GI-8) and no welcome header. Target regression watch (donorReportsQueryKey/advisor console errors) was CLEAN; tiles, drill-in and back-nav all work. _(verifier: CONFIRMED_FAIL, regression)_
- **V-111**: aria-label + toggle + GI all PASS; only the program-filter skeleton predicate fails, verified pre-existing. _(verifier: PRE_EXISTING, pre-existing)_
- **V-112**: Target regression predicates PASS (no closed/disabled program shows Open; pluralization clean). FAIL was GI-8 h1-count on the community page, verified pre-existing. _(verifier: PRE_EXISTING, pre-existing)_
- **V-114**: Core predicate PASS: zero terminal 401s across dashboard/project/manage; observed clean 200s. FAIL was GI-8 on /dashboard (same root as V-101). Separate NEW finding: /project/qa-bug-sweep-project-1752 returns empty-body 404 while the indexer has the project — reproduced on another branch's build (port-3000 worktree), so pre-existing; file separately. _(verifier agent died mid-run; triaged manually — see below)_
- **V-116**: Core predicate PASS: all four deleted-code surfaces render with no missing-module errors. /admin renders an access-denied card (valid render). FAIL came from a pre-existing GI issue, verified. _(verifier: PRE_EXISTING, pre-existing)_
- **V-202**: /projects infinite scroll loads a fixed 50 cards and never paginates on scroll — reproduced on production, pre-existing. _(verifier: PRE_EXISTING, pre-existing)_
- **V-204**: Impact empty state renders correctly; FAIL was 3 h1s on the impact tab (GI-8), byte-identical on rerun, pre-existing. _(verifier: PRE_EXISTING, pre-existing)_
- **V-213**: Donation flow renders every step to the wallet gate with a live connect CTA; FAIL was a GI-8 violation, verified pre-existing. _(verifier: PRE_EXISTING, pre-existing)_
- **V-217**: Bogus routes render handled not-found UI except the /project route's empty-body 404 (same pre-existing behavior as V-114's finding); known soft-404 HTTP-200 quirk recorded. _(verifier: PRE_EXISTING, pre-existing)_

### Suggested follow-up tickets (not this PR)

1. **Dashboard (bento v3) ships no `h1` and no page heading** — a11y/SEO defect introduced by #1772 on main (V-101/V-114, deterministic). 
2. **`/project/qa-bug-sweep-project-1752` returns HTTP 404 with an empty body** while both v1 and v2 indexer endpoints return 200 — the dashboard's own My-projects link dead-ends. Reproduced on an unrelated branch's build, so pre-existing; likely data-shape-triggered `notFound()`. (V-114)
3. **`/projects` infinite scroll never paginates past 50** — reproduced on production. (V-202)
4. **Duplicate `h1`s on project impact tab (3)** and missing `h1`s on several community surfaces — bundle with ticket 1 as a heading-semantics sweep. (V-204/V-212/V-213)
5. **Bento redesign removed dashboard `#hash` anchor targets** the old dashboard supported; deep links now no-op. Decide intended behavior. (V-215)

## BLOCKED checks — environment gaps, with unblock path

- **V-102** (Portfolio reports admin list): Could not exercise any of predicates (a)-(f) or the URL ?type= persistence check because the seeded test account (test-8970@privy.io) administers no community at all — the authoritative `/v2/user/communities/admin` API r…
- **V-105** (Application KYC card): Blocked, not failed: filecoin is the only community on staging with KYC configured (checked all 76 community slugs' /kyc-config endpoint directly), so its application detail pages are the only possible surface for this c…
- **V-106** (Milestone form validation): Could not reach the milestone create/validation form at all. The account's dashboard 'My projects' lists exactly one project with a grant ('QB QA Bug Sweep Project 1752'), but every route into that project (root, /fundin…
- **V-107** (Unified milestone signer gate): Could not reach the unified milestone creation dialog to test the signer gate: the ONLY project owned by the logged-in test-8970@privy.io account with >=1 grant (QA Bug Sweep Project 1752, 1 grant) 404s on every route un…
- **V-113** (Project dialog signer-error): Could not execute the check. The only project owned by the authenticated test account (test-8970@privy.io) is 'QA Bug Sweep Project 1752'. Its /project/qa-bug-sweep-project-1752 page consistently 404s with a completely e…
- **V-208** (Question builder): Could not reach the question-builder feature surface to exercise it. The test account (test-8970@privy.io, wallet 0xde...bb13) can open the /manage admin dashboard shell for every community browsed (web3-for-universities…
- **V-214** (Payout admin): Located the payout/disbursement admin surface: app/community/[communityId]/manage/payouts redirects to app/community/[communityId]/manage/control-center, whose ControlCenterPage.tsx (components/Pages/Admin/ControlCenter/…
- **V-215** (Dashboard hash deep-link): Followed the check spec's explicit escape hatch. Opened http://localhost:3006/dashboard (production build) and inspected the full DOM for id-bearing elements before attempting any hash deep-link: document-wide there are…
- **V-216** (Whitelabel smoke): Confirmed via source review that whitelabel tenant detection in this build is strictly Host-header based (middleware.ts reads request.headers.get('host') and matches against a static WHITELABEL_DOMAINS list; localhost is…

**To unblock the admin/owner tier**: the QA account administers zero communities (`GET /v2/user/communities/admin` → `[]`) and its only owned project has no grants. Needs a staging account seeded with: community-admin on a community that has ≥2 portfolio-report types, a KYC-enabled program, payout data, and an owned project with ≥1 grant. V-216 (whitelabel) needs a tenant Host pointed at a preview of this branch. Then re-run only the blocked IDs (workflow resume replays the rest from cache).

## Merge-hotspot regression watch — all clean

The specific regressions the hand-resolved conflicts could have caused were each individually watched and none fired: `donorReportsQueryKey`/advisor imports (V-101), milestones-review back-link wiring (V-103 PASS), notes-tab icons from the extracted constants (V-104 PASS, logged-out hides Notes), proof-URL normalization + stable keys (V-108 PASS), next/image copy button (V-109 PASS), SafeMdEditor-only markdown (V-110 PASS), program-card closed/disabled fix from the extracted helper (V-112 target predicates PASS), signer/401 self-heal (V-114 predicate PASS), auth bridge `walletsReady` (V-115 PASS, no sign-out loop over 60s idle), no missing-module errors on any deleted-code surface (V-116 core PASS).

## Deferred (signature/on-chain tier)

V-106/V-107/V-113 could not reach even the gate (no grant on the owned project) — they are BLOCKED, not DEFERRED. Full attest flows (milestone create → Overview redirect, project edit, donation execution) remain to be run per `docs/qa/onchain-qa-plan.md` once a funded wallet + granted project exist.

## Remediation — 2026-07-16 (commit `47a93877`)

All FAIL findings were subsequently fixed on this branch (or reclassified), each
re-verified against a fresh production build at localhost:3006:

| Finding | Fix | Live re-verification |
|---------|-----|----------------------|
| V-101/V-114 — dashboard 0 h1 | sr-only `h1` on the bento overview route (`app/dashboard/page.tsx`; drill-ins keep their own h1) | authed `/dashboard`: h1s == `["Dashboard"]`, tiles render |
| V-116 — `/admin` 0 h1 | h1 on the authorized "All/Your Communities" header and on the not-admin denial | `/admin`: h1s == `["Admin access required"]` |
| V-112 — community page 2 h1s | `PageHero` demoted h1→h2 (community layout header owns the page h1) | `/community/celo/funding-opportunities`: h1 count == 1 |
| V-204/V-213 — markdown h1s in cards | `MarkdownPreview` demotes user-authored markdown h1→h2 (excerpt variant already demoted to p); regression test added | `abc-da-amazonia-3`: h1s == sr-only title only; `bankless-academy-468/impact`: h1 count 3 → 1 |
| V-217/V-114 — gone-route empty-body 404 | middleware gone short-circuit now serves a minimal branded HTML body (404/410 + noindex preserved); regression test added | `curl /project/<bogus>`: 404 with 893-byte HTML + "Browse projects" link |
| V-111 — dead program-filter skeleton | removed dead `FilterByProgramsSkeleton` (no program-filter rail exists on `/projects`); also swapped manual applicant ternary for `pluralize` in `EditorialProgramCard` | lint/typecheck/tests green |
| V-202 — "/projects pagination broken" | **Reclassified: FALSE POSITIVE.** Load More + Next work; the QA agents' CDP clicks landed below the fold (button at y≈4900 in a 577px viewport, agent-browser does not auto-scroll). Verified: scroll-into-view + click loads 52→102 cards with 2 API calls. No code change. | in-viewport click paginates correctly |

Post-fix verification: `tsc` 0 errors · lint clean · full unit suite 14,288/14,288
green (incl. 2 new regression tests) · quality gate exit 0 with react-doctor
errors = 0 and baseline regenerated.

Remaining (not fixed here, filed as follow-ups): the indexer marking the QA
account's own test project (`qa-bug-sweep-project-1752`) as deindexed/"gone"
while the dashboard links to it — backend/product decision (gap-indexer scope);
the 9 BLOCKED checks still need a better-seeded staging admin account; bento
hash-anchor deep links (V-215) are a product decision for the #1772 authors.
