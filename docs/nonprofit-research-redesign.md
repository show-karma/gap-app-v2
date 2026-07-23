# Nonprofit Research (Advisor) — Redesign Notes & Proposal

Status: spec for implementation on `feat/redesign-nonprofit-research`.
Scope: frontend only (`gap-app-v2`). No API/backend changes; no type renames in `types/` or services.

This document is the single source of truth for the redesign. Part 1 is the
capability contract — nothing listed there may be lost. Part 2 is the target
design. Part 3 is the phased implementation plan.

---

## Part 1 — Current state

### 1.1 Route map (today)

| URL | Screen | Audience |
|---|---|---|
| `/nonprofit-research` | Home: new-report form + past-reports list (`DonorResearchHome`) | Advisor |
| `/nonprofit-research/onboarding` | 3-step wizard (`OnboardingFlow`) | New advisor |
| `/nonprofit-research/[reportId]` | Editorial report brief (`ReportBriefView`) | Advisor owner / staff |
| `/nonprofit-research/diligence-template` | Diligence question editor | Advisor |
| `/nonprofit-research/diligence/[token]` | Anonymous nonprofit Q&A page | Nonprofit (token) |
| `/nonprofit-research/shared/[token]` | Donor share view + comments | Donor persona (token) |
| `/admin/nonprofit-research` | Staff overview | Staff |

External entry points: `/donor-advisors` marketing page; Dashboard v3 advisor
module (`components/Pages/Dashboard/v3/AdvisorModule.tsx` — a parallel
management surface); community admin panel → admin overview.

### 1.2 Capability contract (MUST be preserved, screen by screen)

**Advisor home / report creation** (`common/DonorResearchHome.tsx`, `criteria-input/*`)
- Redirect to onboarding when `useDonorAdvisor` → `advisor === null`; loading skeleton; error to boundary.
- `RateLimitCounter`: today's per-channel usage/caps (`useDonorCounters`, 60s refetch; "—" when backend degraded).
- Criteria form (RHF + Zod): criteria text (required, ≤5000), cause, geography, amountMin/Max.
- Donor-handle picker: select / create / edit; `useDonorHandles({limit:200})`.
- Persona prefill on handle select (best-effort, silent fallback, per-field "Prefilled from persona" badges, never writes back).
- Discard-guard dialog when switching handle with dirty form (select visually reverts until confirmed).
- 5-dimension weights allocator summing to 100% (10000 bp): onlinePresence, socialPresence, impactRecency, donorMatch, compliance; `topCount` stepper 1–25.
- Submit → `useCreateDonorReport` → `router.push(PAGES.DONOR_RESEARCH.REPORT(id))`; inline error.

**Handle + persona** (`criteria-input/NewDonorHandleModal.tsx`, `donor-detail/*`)
- Create handle (label) with optional persona step; edit persona for existing handle.
- `PersonaEditor`: single source textarea (≤20000); LLM Refine (`useRefineDonorPersona`) with in-field Accept/Reject bar; "refine extracted nothing" notice; structured chips (orgMaturity, geoRadius, faithStance, giftSizeBand, advocacyStance) hand-editable with "Reset to AI extraction"; extracted scalars (amountMin/Max, cause, geography) persisted and used for prefill; optimistic save (`useUpdateDonorPersona`, writes `sourceText` + accepted `narrative`); rate-limit toasts (refine 20/hr, write 60/hr); dirty tracking + unsaved-changes discard confirm; loading/error+retry states. Persona editor is `dynamic()`-imported.
- `HandleNotesSection`: private advisor notes, optimistic PATCH (`useUpdateDonorHandle`).

**Report list** (`report-list/ReportListPanel.tsx`)
- `useDonorReports({limit:25, donorHandleId?})`; filter by handle; loading/error+retry/empty (distinct copy filtered vs not); rows show `StatusBadge`, mode Fast/Deep, criteria headline, donor label, timestamps, error message, "Shared" pill.

**Onboarding** (`onboarding/OnboardingFlow.tsx`)
- 3 steps: Welcome → Sample report preview → form (displayName required, email required + Privy prefill, orgName optional, IANA timezone auto-detected).
- Idempotent `useOnboardAdvisor`; auto-redirect to index if advisor exists; a11y: aria-current stepper, focus to step heading, role="alert" errors (issue #1587).

**Report detail** (`report-brief/*`, `report-viewer/*`)
- Data: `useDonorReport` (5s poll while non-terminal) + `useDonorReportStream` (SSE while non-terminal, Bearer JWT, dedup, ≤5 retries); owner check via `useDonorAdvisor`; variants advisor/staff/shared — owner-only controls render only once ownership CONFIRMED.
- Dynamic headline + byline copy driven by considered/surfaced/mode/status (keep the logic in `Masthead.tsx:150-187`).
- `ProgressTimeline`: 7 stages (Connected → Candidate pool → Compliance verdict → Contact discovery → Activity signal → Composite ranking → Report finalized), live captions, error count.
- `FailedReportBanner`, `GeographyWarning`, `DisqualificationSummary` (terminal + 0 featured), `QueryDisclosure` (criteria + donor label; hidden on shared).
- Candidates: lead + runners-up + comparison table (≥2 featured) + "Also considered" pool + Methodology. Per candidate: name/EIN/locale/website, description, one-pager prose, "Our take" reasoning summary, `FinancialsTable` (990), recent coverage, `SocialPresence`, composite /100 + band, `ScoreBreakdownTable`, `ComplianceStrip`/`ComplianceBreakdown`, last-mention date.
- **Adjust ranking** (`WeightsPanel` Sheet): shared draft with 5 allocators (sum 100%), topCount stepper, live client-side re-rank (`use-live-ranked-candidates` + `scoring.ts`), entering/leaving-featured badges, dnd-kit manual reorder, ordering semantics (weight change drops manual order; manual drag overrides until weights change), Save commits config first then reorder (`useUpdateReportConfig`, `useReorderReport`, both optimistic), `CommitWeightsDialog` confirm, Reset, Escape-on-grip cancels drag not sheet.
- **Share** (`ShareTokenControls`): generate (30d TTL) / copy link (`useCopyToClipboard`) / regenerate / revoke (both behind `DeleteDialog`), expiry display, pending state.
- Per-candidate **diligence footer** (advisor variant only): `useCandidateDiligence` self-fetch, status badge, intro-sent label, gated "Ask questions" / "Connect" buttons, frozen Q&A snapshot rendering (`DiligenceAnswers`).

**Diligence dialogs** (`diligence/*`)
- `AskQuestionsDialog` (anonymous): backend-composed editable email preview (`useOutreachPreview action="diligence"`); untouched body sent as no-body; 202 async idempotent send; `blocked` (no contact) → error toast; inline first-run question setup (`InlineQuestionSetup`) saving to the template; link to template editor.
- `ConnectDialog` (named intro): preview `action="intro"`; 422 `email_required` → email-capture step (`useUpdateAdvisorEmail` reusing POST /me) → auto-retry preserving edited body; non-`intro_sent` 202 → no-contact toast.

**Diligence template** (`diligence-template/DiligenceTemplateEditor.tsx`)
- One template per advisor; GET + wholesale PUT; drag-sortable rows (dnd-kit); add/remove; per-row validation; `MAX_QUESTIONS` cap + remaining counter; stable question ids across reorder; empty state is editable CTA not error; clear-template confirm; "Last saved" timestamp; toasts.

**Nonprofit response page** (`diligence-response/*`)
- Token-capability, anonymous, `force-dynamic`, noindex; unknown/expired collapsed to one generic message (anti-enumeration); already-submitted thank-you; one textarea per question (all optional, ≥1 required, ≤ANSWER_TEXT_MAX); double-submit guard; status-mapped errors (429/404/410/422/403); shows only orgName + expiry (no advisor/donor identity).

**Donor share view** (`shared-view/SharedReportView.tsx`)
- Standalone fetcher (no React Query); 30s poll while non-terminal; bounded recovery polls (max 5) on revoked/invalid; "Research not available" state; renders brief `variant="shared"`; best-effort advisor-viewer detection (Privy + `useDonorAdvisor` when authenticated) for identity badge — indexer stamps `is_advisor` authoritatively.
- **Comments** (`CommentOverlay` + `useCommenting`): right Sheet with threaded comments (roots + replies via `assembleCommentTree`); anchored comments — text-selection affordance, section "+" buttons, pins (anchor kinds `section` / `candidate` / `text_range`); text-range highlights; orphan lane with preserved quotes; general comments anchored to masthead; composer root/reply/general; identity capture dialog (name + email) before first anonymous post, `requiresIdentity` deferral for authenticated; `IdentityBadge` with edit-name + switch identity; idempotency-key + optimistic post + retry-failed; cursor pagination; error mapping (`IdentityRequiredError`, `RateLimitedError` "try again in Ns", `IdempotencyCollisionError`); pin↔row bidirectional focus/scroll; aria-live announcements; hides global chat FAB while open. Per-comment edit/delete = 405 stubs (out of scope, keep stubbed).

**Admin** (`admin/AdminAdvisorsList.tsx`)
- Stat cards (advisors+beta, donors, reports+completed, shared); server-side search w/ nuqs URL state + debounce; browser-side filter/sort; expandable advisor → donors → reports; "View" links to report; pagination; loading/error/empty states.

### 1.3 What is purely "today's design" (safe to replace)

- **Feature-private typography**: Bricolage Grotesque + Spectral via `report-brief/fonts.ts`, applied inline (`${briefDisplay.className}`) across 15 files. Platform standard is self-hosted Inter (+ JetBrains Mono for numerals).
- **Editorial "printed research memo" idiom**: magazine masthead (eyebrow `Karma · Research Brief`, issue `No. XXXXXX`, `Issued/Updated` small caps), `ChapterMark` letterpress dividers (giant numeral + hairline rule), pull-quote blockquotes with "✦ Our take" tabs, two-column editorial spread with `lg:border-l` aside, `clamp()` display type, `tracking-[0.28–0.34em]` (×79), `uppercase` (×81), ch-based prose measures (`max-w-[58ch]` etc.), single centered `max-w-[1100px]` column with hairline `border-t` section rules instead of cards.
- **Bespoke controls**: 49 raw hand-styled `<button>`s across 23 files; 3 hand-built editorial tables (`FinancialsTable`, `ComparisonTable`, `ScoreBreakdownTable`).
- **Hand-rolled page chrome**: `DonorResearchHome` `max-w-5xl` header; no section nav; `src/features/nonprofit/Sidebar.tsx` hardcodes gray/zinc instead of semantic tokens.
- Already compliant (keep): zero hardcoded colors, full dark-mode, semantic tokens, shadcn Dialog/Sheet/Input usage in forms, `PAGES` constants, `DeleteDialog`, `useCopyToClipboard`, react-hot-toast, pluralize.

### 1.4 Flow/UX problems (why it feels confusing)

1. **Form-first home**: the landing page IS a long creation form; history is secondary. No overview.
2. **No persona (handle) pages**: handle + profile management lives entirely inside a heavy modal (`NewDonorHandleModal` hosts LLM refine, chips, notes, with fragile Radix outside-dismiss workarounds). `useDonorHandle`/`getDonorHandle` exist but no route uses them.
3. **Orphan diligence template page**: reachable via a small header text link.
4. **Two parallel surfaces**: Dashboard v3 `AdvisorFullView` duplicates reports/handles management with different chrome.
5. **Report page is a foreign object**: editorial serif document sandwiched by the standard navbar/footer.
6. **Navigation dead-ends**: staff viewing a report have no back affordance; report back-link is owner-only.
7. **Naming split**: `report-viewer/` vs `report-brief/` directories are a half-finished migration.
8. **Share is thinner than its API** (`ttlSeconds`, `shareDisplayName`, `shareIntroText` unsupported in UI) — out of scope to add, but the layout should leave room.

---

## Part 2 — Redesign proposal

### 2.1 Principles

- **One design language.** The section adopts the platform's Dashboard v3 "Soft" system: `SoftShell`, `sf-*` tokens (`bg-sf-card`, `border-sf-line`, `rounded-sf-card`, `shadow-sf-card`), primitives (`Section`, `EmptyState`, `ErrorState`, `StatTiles`, `SkeletonList` from `components/Pages/Dashboard/v3/primitives.tsx`), `soft-classes.ts` button/badge constants, shadcn `components/ui/*`, Inter type, `font-mono` for numeric readouts. No feature-private fonts.
- **List-first, like every mature workspace tool** (Stripe Dashboard, Linear): the section opens on your work (reports), creation is a prominent CTA leading to a dedicated page, resources (personas) get list + detail routes, and detail pages have a standard header (breadcrumb, title, status, actions).
- **Pages over modals for heavy work**: profile authoring moves to a persona detail page; modals remain for quick, single-purpose actions (quick-create persona, confirms, outreach previews).
- **Anchors are sacred**: donor comments resolve against `data-section` attributes, candidate anchor ids, and text quotes (`shared-view/anchor/*`). The restyled brief MUST keep every existing `data-section` value and candidate anchor id, and SHOULD keep visible candidate prose text stable, so existing comments keep resolving (text-range anchors have quote-based orphan fallback — structural anchors must not regress).

### 2.2 New information architecture

```
/nonprofit-research                     Reports (section home: list + stats + New report CTA)
/nonprofit-research/new                 New report (criteria form page)
/nonprofit-research/personas            Personas (donor handles) list
/nonprofit-research/personas/[handleId] Persona detail: profile, notes, reports
/nonprofit-research/diligence-template  Diligence questions (unchanged URL, now in section nav)
/nonprofit-research/[reportId]          Report detail (unchanged URL, redesigned)
/nonprofit-research/onboarding          Onboarding wizard (restyled, no section nav)
/nonprofit-research/shared/[token]      Donor share view (standalone chrome, restyled)
/nonprofit-research/diligence/[token]   Nonprofit Q&A (standalone chrome, restyled)
/admin/nonprofit-research               Admin (light polish only)
```

- New `PAGES.DONOR_RESEARCH` constants: `NEW`, `PERSONAS`, `PERSONA(handleId)`. Never hardcode.
- Next.js static segments (`new`, `personas`, `diligence-template`, `onboarding`, `shared`, `diligence`) win over `[reportId]` — no conflict.
- UI vocabulary: donor handles are presented as **"Personas"** (nav item, page titles, helper copy: "Anonymous profiles for the donors you advise"). Code/API names unchanged.

**Section shell**: a client component `DonorResearchShell` (new, `src/features/donor-research/components/common/DonorResearchShell.tsx`) rendered by the advisor-facing pages (home, new, personas, persona detail, diligence-template, report detail). Modeled on `AdvisorFullView`'s LeftRail + `SoftShell`:
- Desktop: sticky left rail — section title "Nonprofit Research", nav items (Reports, Personas, Diligence questions) with `usePathname()` active state, and a persistent "New report" primary button. Below: `RateLimitCounter` compact usage block.
- Mobile: rail collapses to a horizontal scrollable tab row under a compact header.
- The shell does NOT wrap token pages (shared/diligence response), onboarding, or admin.
- Advisor gate lives in the shell: `useDonorAdvisor` loading skeleton → `advisor === null` redirect to onboarding → error to boundary. Individual pages then assume an advisor exists.

### 2.3 Screen-by-screen

**Reports (home).** Header row: page title "Reports" + short description + "New report" button (shell CTA also exists). `StatTiles`: total reports, completed, shared, active personas (derive from existing list/counters data only — no new endpoints; drop any tile whose datum isn't already available). Below: `ReportListPanel` restyled as `sf-card` rows — status dot badge, headline, persona label, mode chip, relative timestamps, "Shared" pill — with existing filter-by-persona dropdown, three states preserved. Row click → report detail.

**New report** (`/new`). Single-column form page (max-w-3xl) in `sf-card` sections: (1) Persona — picker + quick-create; (2) Criteria — text/cause/geography/amounts with prefill badges; (3) Ranking preferences — weights allocator + topCount inside a collapsed-by-default "Advanced" disclosure (open automatically when profile prefill customized weights); (4) sticky footer: rate-limit hint + "Create report" primary button. All existing behaviors preserved (prefill, discard-guard, validation, inline error, redirect on success). Quick-create here is the slimmed name-only dialog; after create it selects the new persona and links "Add profile → Persona page".

**Personas list.** Grid/list of `sf-card` rows: label, profile chip ("Profile ready" / "No profile yet"), notes preview line, report count if available from existing data, updated date. Actions: open detail; "New report" per row (→ `/new?handle=<id>` preselect via searchParam). Header: "New persona" button → quick-create dialog → navigate to detail. Three states (empty state sells the concept: "Create a persona to research on a donor's behalf").

**Persona detail.** `PageHeader` pattern: breadcrumb (Personas / {label}), title = handle label, subtitle "Persona profile". Two-column on desktop: main = **Research profile** card hosting the existing `PersonaEditor` inline (dynamic import stays; Refine/Accept/Reject/chips/save identical) ; side = **Notes** card (`HandleNotesSection`) + **Reports** card (filtered list via existing `useDonorReports({donorHandleId})`, link "New report for this persona"). `NewDonorHandleModal` slims to quick-create (label only) — its profile step is removed in favor of this page; edit-profile entry points route here.

**Report detail.** The heart of the redesign. Keep every capability from §1.2; replace the editorial idiom:
- **Header** (in-shell for advisors; staff see breadcrumb "Admin / Nonprofit research / Report"): breadcrumb, report title (keep the dynamic headline logic: "N nonprofits worth your attention" etc.), byline sentence as muted description, `StatusBadge`, meta line (issue id, issued/updated dates, mode chip). Actions right: "Adjust ranking" (opens existing `WeightsPanel` sheet), "Share" (existing `ShareTokenControls`), both owner-only + terminal-only as today.
- **Running state**: `ProgressTimeline` in an `sf-card` (SSE unchanged), followed by `SkeletonList` placeholders.
- **Summary strip**: `StatTiles` — considered, surfaced, mode, issued.
- **Query disclosure**: collapsed `sf-card` disclosure showing criteria + persona label (hidden on shared, as today).
- **Candidates**: each featured candidate is an `sf-card`: rank badge + org name + EIN/locale/website row; composite score as a compact `font-mono` figure with band chip (not a giant numeral); "Our take" as a highlighted callout (left brand border, no serif blockquote); prose in Inter; `FinancialsTable`/`ScoreBreakdownTable` restyled as clean data tables (`text-sm`, `tabular-nums`, sf borders); `SocialPresence`, compliance strip, coverage list; diligence footer unchanged. Lead candidate may be visually richer (larger card, two-column body) but same component structure.
- **Comparison table / Also considered / Methodology**: `sf-card` sections; Methodology as collapsible.
- **Anchor preservation**: every current `data-section` value and candidate anchor id must survive verbatim (grep `data-section=` before/after; parity test).
- Delete `fonts.ts` and every `briefDisplay`/`briefProse` usage.

**Shared view.** Same restyled brief, `variant="shared"`. Standalone chrome: slim top bar (Karma logo, "Prepared by {advisor}" when available, `IdentityBadge` right) + restyled content + footer note. Comments overlay untouched functionally; pins/affordances restyled to platform tokens only.

**Nonprofit Q&A page.** Centered single card (max-w-2xl): Karma mark, "A donor advisor is researching organizations like yours", org name, expiry, question textareas, submit. Keep all guards/states/copy semantics (esp. anti-enumeration generic message).

**Onboarding.** Same 3 steps and a11y contract; restyle as Soft cards with the standard stepper look; sample-report preview updated to match the new report design (static mock is fine).

**Admin.** Light-touch: stat cards → `StatTiles`, table rows → sf tokens. No behavior change.

**Dashboard advisor module.** Not rebuilt. Cross-link fixes only: Handles tab management CTAs → `/nonprofit-research/personas`; "New report" → `/nonprofit-research/new`; edit-profile opens persona detail instead of the fat modal.

### 2.4 Explicit non-goals

- No backend/API changes; no new endpoints; no share-personalization UI (`shareDisplayName` etc.); no per-comment edit/delete (keep 405 stubs); no changes to SSE/polling strategies; no renaming of code identifiers/types/services; no changes to `/donor-advisors` marketing page.

### 2.5 User flows (unit of done)

1. New advisor: land on `/nonprofit-research` unauthenticated-advisor → onboarding wizard → back to Reports home.
2. Create persona → author profile (refine → accept → save) on persona detail page.
3. New report: `/new`, pick persona (prefill badges appear), tweak weights, create → live progress (7 stages) → terminal brief.
4. Adjust ranking: weights + manual drag → confirm dialog → optimistic re-rank persists.
5. Diligence: Ask questions (incl. empty-template inline setup) → token page answer submit → answers on candidate card → Connect (incl. email-capture recovery path).
6. Share: generate → copy → open `/shared/[token]` → anchored comment with identity capture → advisor reply stamped as advisor.
7. Staff: admin overview → open a report → breadcrumb back to admin.

---

## Part 3 — Implementation plan (workflow phases)

Run from `gap-app-v2` root. Tests: `./node_modules/.bin/vitest run <paths>`; lint: `pnpm lint:fix`. Never commit — leave the working tree for review. Every new route gets `page.tsx` + `loading.tsx` + `error.tsx`. Update `utilities/pages.ts` first.

- **P1 — Section shell + Reports home + New report page.** `DonorResearchShell`, restyled home (list-first), `/new` route with the criteria form moved from `CriteriaInputPanel` (keep component, host on the page), PAGES constants, redirect/gate moved into shell. Existing tests for `CriteriaForm`/list updated.
- **P2 — Personas.** `/personas` + `/personas/[handleId]` routes; persona detail hosting `PersonaEditor` + `HandleNotesSection` + filtered reports; slim `NewDonorHandleModal` to quick-create; reroute edit-profile entry points; `?handle=` preselect on `/new`.
- **P3 — Report detail restyle.** Rewrite `report-brief/*` presentation to Soft idiom per §2.3; delete `fonts.ts` usages from advisor+staff surfaces; preserve all `data-section`/anchor ids (add a parity test asserting the set of `data-section` values); keep `WeightsPanel`/`ShareTokenControls`/diligence footers working; staff breadcrumb.
- **P4 — Token pages + onboarding.** Shared view chrome + restyled overlay affordances; nonprofit Q&A page; onboarding restyle; final removal of `fonts.ts` and Bricolage/Spectral imports repo-wide within the feature.
- **P5 — Consolidation + polish.** Raw `<button>`s → `components/ui/button` (except where a plain button is semantically necessary, e.g. selection affordances); tables to a shared restyled table treatment; `src/features/nonprofit/Sidebar.tsx` token fixes if still referenced; dashboard cross-links; admin polish; full feature test pass + lint; grep-verify no `briefDisplay|briefProse|Bricolage|Spectral` remain in `src/features/donor-research`.

Each phase must leave: all feature tests green, lint clean, three-states intact, no new `console.*`, no hardcoded routes/colors, `pluralize` for counts, `React.memo` on `.map()` list items, `"use client"` where Radix is imported.
