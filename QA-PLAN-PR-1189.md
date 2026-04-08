# QA Plan — PR #1189: Milestone Index Numbering

**Feature:** Prepend "Milestone 1:", "Milestone 2:", etc. to milestone labels across all list views.
**Risk level:** Medium — display-only change touching 5 views across admin, public, and grant-creation flows.
**Author:** QA Engineering
**Date:** 2026-04-01

---

## 1. Scope

### What changed

| # | Component | Route | Description |
|---|-----------|-------|-------------|
| 1 | `formatMilestoneTitle` utility | N/A | New utility: prepends "Milestone N:" with double-prefix guard |
| 2 | `MilestonesSection` | `/community/[id]/manage/control-center` | Admin sidebar milestone table |
| 3 | `Milestone` (NewGrant) | `/project/[id]/funding/new` and `.../[grantUid]/edit` | Grant creation/edit wizard, collapsed milestone card |
| 4 | `MilestoneDisplay` | Currently unused (dead code path via FieldDisplay) | Application milestone display |
| 5 | `MilestoneSelectionStep` | `/community/[id]/manage/control-center` (disbursement modal) | Payout milestone selection |
| 6 | `PublicProjectDetailsModal` | `/community/[id]/financials` | Public financials project details |

### What did NOT change (intentionally)

| Component | Reason |
|-----------|--------|
| `PendingVerificationTable` | Shows milestones from multiple grants — array index is queue position, not milestone position within a grant |
| `ActivityFeed` / `MilestoneCard` | Timeline/detail views showing individual milestones, not ordered lists |
| `MilestonesList` | Activity card list, not a numbered milestone table |
| `MilestonesReview` (admin) | Review queue across grants — same reasoning as PendingVerificationTable |

---

## 2. Test Environment Prerequisites

- Local dev server running (`pnpm run dev`)
- Access to at least one community where you are an admin
- At least one project with a grant that has 3+ milestones
- At least one grant with milestones in various states (pending, completed, overdue)
- A second grant with milestones whose titles already contain "Milestone N:" prefixes (to test double-prefix guard)
- Browser DevTools open (Console tab) to watch for React errors/warnings

---

## 3. Unit Test Verification

| ID | Test | Command | Expected |
|----|------|---------|----------|
| UT-1 | formatMilestoneTitle utility | `pnpm vitest run --project unit __tests__/unit/utilities/format-milestone-title.test.ts` | 5/5 pass |
| UT-2 | MilestonesSection component | `pnpm vitest run --project unit __tests__/unit/components/Pages/Admin/MilestonesSection.test.tsx` | 3/3 pass |
| UT-3 | MilestoneSelectionStep component | `pnpm vitest run --project unit src/features/payout-disbursement/__tests__/MilestoneSelectionStep.test.tsx` | 27/27 pass |
| UT-4 | TypeScript compilation | `pnpm tsc --noEmit` | Zero errors |

---

## 4. Functional Tests — `formatMilestoneTitle` Logic

These are the core formatting rules. Every view that uses the utility inherits this behavior.

| ID | Input (index, title) | Expected Output | Rationale |
|----|----------------------|-----------------|-----------|
| FMT-1 | `(0, "Setup infrastructure")` | `"Milestone 1: Setup infrastructure"` | Basic 0-based to 1-based conversion |
| FMT-2 | `(1, "Build prototype")` | `"Milestone 2: Build prototype"` | Sequential numbering |
| FMT-3 | `(9, "Final delivery")` | `"Milestone 10: Final delivery"` | Double-digit numbers |
| FMT-4 | `(0, "  Spaced title  ")` | `"Milestone 1: Spaced title"` | Whitespace trimming |
| FMT-5 | `(0, "")` | `"Milestone 1"` | Empty title fallback (no colon) |
| FMT-6 | `(2, "   ")` | `"Milestone 3"` | Whitespace-only title fallback |
| FMT-7 | `(0, "Milestone 1: Setup")` | `"Milestone 1: Setup"` | No double-prefix (matching number) |
| FMT-8 | `(2, "Milestone 3")` | `"Milestone 3"` | No double-prefix (no colon variant) |
| FMT-9 | `(2, "Milestone 1: Design")` | `"Milestone 1: Design"` | No double-prefix (mismatched number) |
| FMT-10 | `(0, "Milestone 5: Launch")` | `"Milestone 5: Launch"` | No double-prefix (mismatched number) |
| FMT-11 | `(4, "Milestone 2")` | `"Milestone 2"` | No double-prefix (mismatched, no colon) |

---

## 5. Integration Tests — View-by-View

### 5.1 Control Center — MilestonesSection

**Route:** `/community/{communityId}/manage/control-center`
**Precondition:** Logged in as community admin. At least one project with a multi-milestone grant.

| ID | Step | Expected | Pass/Fail |
|----|------|----------|-----------|
| CC-1 | Navigate to Control Center | Page loads without errors | |
| CC-2 | Click on a project row to open the sidebar | ProjectDetailsSidebar opens | |
| CC-3 | Scroll to the Milestones section | Milestone table is visible | |
| CC-4 | Verify first milestone label | Shows "Milestone 1: {original title}" | |
| CC-5 | Verify second milestone label | Shows "Milestone 2: {original title}" | |
| CC-6 | Verify third milestone label | Shows "Milestone 3: {original title}" | |
| CC-7 | Verify numbering is sequential (1, 2, 3...) regardless of milestone status | Numbers follow array order, not status | |
| CC-8 | Inspect the invoice date input aria-label | Should read "Invoice received date for Milestone N: {title}" | |
| CC-9 | Open a grant with no milestones | Shows "No milestones configured yet." empty state | |
| CC-10 | Open a grant whose milestones already have "Milestone N:" in their titles | No double-prefix ("Milestone 1: Milestone 1: ...") | |

### 5.2 Grant Creation/Edit Wizard — Milestone Card

**Route:** `/project/{projectId}/funding/new` (create) or `/project/{projectId}/funding/{grantUid}/edit` (edit)
**Precondition:** Logged in as project owner.

| ID | Step | Expected | Pass/Fail |
|----|------|----------|-----------|
| GW-1 | Navigate to "Add Grant" for a project | Grant wizard opens on first step | |
| GW-2 | Proceed to the Milestones step | Milestone form appears | |
| GW-3 | Add a milestone with title "Design phase" | Collapsed card shows "Milestone 1: Design phase" | |
| GW-4 | Add a second milestone "Build prototype" | Collapsed card shows "Milestone 2: Build prototype" | |
| GW-5 | Add a third milestone with empty title | Collapsed card shows "Milestone 3" (no colon) | |
| GW-6 | Delete the second milestone | Remaining milestones renumber: "Milestone 1: Design phase", "Milestone 2" | |
| GW-7 | Edit an existing grant with pre-existing milestones | Milestones show correct numbering in collapsed view | |
| GW-8 | Verify the edit mode (expanded) does NOT show the prefix in the title input field | The input field contains the raw title, not the formatted one | |

### 5.3 Payout Disbursement — MilestoneSelectionStep

**Route:** `/community/{communityId}/manage/control-center` (via Create Disbursement modal)
**Precondition:** Logged in as community admin. Grant with allocated milestones exists.

| ID | Step | Expected | Pass/Fail |
|----|------|----------|-----------|
| PD-1 | Open Create Disbursement modal for a grant | Modal opens | |
| PD-2 | Navigate to the milestone selection step | Milestone checkboxes appear | |
| PD-3 | Verify unpaid milestone labels | Each shows "Milestone N: {label}" with correct numbering | |
| PD-4 | Verify numbering matches the original milestone order (not just unpaid order) | If milestones 1 and 3 are unpaid, they show "Milestone 1" and "Milestone 3", not "Milestone 1" and "Milestone 2" | |
| PD-5 | Verify paid (greyed-out) milestone labels | Also show "Milestone N: {label}" with correct numbering | |
| PD-6 | Verify compact mode (if applicable) | Labels still show numbering | |
| PD-7 | Test with milestones whose labels already contain "Milestone N:" | No double-prefix | |

### 5.4 Public Financials — PublicProjectDetailsModal

**Route:** `/community/{communityId}/financials`
**Precondition:** Public page, no auth required. Community has funded projects with milestones.

| ID | Step | Expected | Pass/Fail |
|----|------|----------|-----------|
| PF-1 | Navigate to the community financials page | Page loads, project list visible | |
| PF-2 | Click on a funded project row | PublicProjectDetailsModal opens | |
| PF-3 | Scroll to the milestones table | Milestone rows are visible | |
| PF-4 | Verify first milestone label | Shows "Milestone 1: {label}" | |
| PF-5 | Verify sequential numbering across all rows | 1, 2, 3... in order | |
| PF-6 | Compare numbering with the same grant viewed in Control Center (CC-4 through CC-7) | Numbers match between public and admin views | |
| PF-7 | Test with a grant that has no milestones | No milestone table rendered (or empty state) | |

---

## 6. Cross-View Consistency Tests

These tests verify that the same grant's milestones show identical numbering across all views.

| ID | Test | Expected | Pass/Fail |
|----|------|----------|-----------|
| XV-1 | Pick a grant with 3+ milestones. View it in Control Center sidebar and in Public Financials modal. | Numbering is identical in both views | |
| XV-2 | Same grant — open the disbursement modal's milestone selection step. | Numbering matches the other two views | |
| XV-3 | Edit the grant in the wizard. Verify collapsed milestone cards show the same numbering. | Matches | |

---

## 7. Edge Cases

| ID | Scenario | Expected | Pass/Fail |
|----|----------|----------|-----------|
| EC-1 | Grant with exactly 1 milestone | Shows "Milestone 1: {title}" (not just the title) | |
| EC-2 | Grant with 20+ milestones | Numbering continues correctly (Milestone 20, 21, etc.) | |
| EC-3 | Milestone title containing the word "Milestone" but not as a prefix (e.g., "Review milestone deliverables") | Gets prefixed: "Milestone 1: Review milestone deliverables" | |
| EC-4 | Milestone title that is "Milestone" (exact word, no number) | Gets prefixed: "Milestone 1: Milestone" | |
| EC-5 | Milestone title with special characters (`<script>`, `"quotes"`, emoji) | Correctly prefixed, no XSS, no rendering errors | |
| EC-6 | Milestone title with unicode/RTL characters | Prefixed correctly, no layout break | |
| EC-7 | Very long milestone title (500+ chars) | Prefixed correctly, `line-clamp-2` CSS truncation still works | |

---

## 8. Regression Tests

These verify that existing behavior was NOT broken.

| ID | Area | Test | Expected | Pass/Fail |
|----|------|------|----------|-----------|
| REG-1 | Activity Feed | View project activity feed with milestone entries | Milestone cards show original titles WITHOUT numbering prefix | |
| REG-2 | Milestone Review (admin) | Navigate to admin milestones review page | Milestones from different grants show original titles WITHOUT numbering prefix | |
| REG-3 | Pending Verification Table | View pending verification queue | Milestones show original titles WITHOUT numbering prefix | |
| REG-4 | Milestone detail/completion dialogs | Click into a milestone to view details or mark complete | Title in dialog matches the original (not double-prefixed from the list view) | |
| REG-5 | Grant creation — saving | Create a new grant with milestones through the wizard | Saved milestone titles in the database do NOT contain the "Milestone N:" prefix (it's display-only) | |
| REG-6 | Search/filter | If any milestone search or filter exists, search by original title | Still finds the milestone (formatting is display-only, not affecting data) | |

---

## 9. Accessibility Tests

| ID | Test | Expected | Pass/Fail |
|----|------|----------|-----------|
| A11Y-1 | Screen reader on MilestonesSection table | Reads "Milestone 1: {title}", "Milestone 2: {title}" for each row | |
| A11Y-2 | Screen reader on invoice date input | Reads aria-label "Invoice received date for Milestone N: {title}" | |
| A11Y-3 | Keyboard navigation in MilestoneSelectionStep | Can tab through checkboxes; labels announce "Milestone N: {title}" | |
| A11Y-4 | High contrast / dark mode | Milestone labels are legible in both light and dark themes across all 4 active views | |

---

## 10. Performance Tests

| ID | Test | Expected | Pass/Fail |
|----|------|----------|-----------|
| PERF-1 | Control Center with a grant that has 50+ milestones | No visible lag when opening the sidebar | |
| PERF-2 | MilestoneSelectionStep with 50+ allocations | `allocationIndexById` useMemo prevents re-computation; no lag on checkbox toggle | |
| PERF-3 | React DevTools Profiler | No unnecessary re-renders caused by `formatMilestoneTitle` (it's a pure function, no state) | |

---

## 11. Browser Matrix

Test the above critical paths (CC-4, GW-3, PD-3, PF-4) on:

| Browser | Version | Pass/Fail |
|---------|---------|-----------|
| Chrome | Latest | |
| Firefox | Latest | |
| Safari | Latest | |
| Edge | Latest | |
| Chrome Mobile (Android) | Latest | |
| Safari Mobile (iOS) | Latest | |

---

## 12. Sign-Off Criteria

All of the following must be true before approving:

- [ ] All unit tests pass (UT-1 through UT-4)
- [ ] All functional formatting tests verified (FMT-1 through FMT-11)
- [ ] All 4 active views show correct numbering (CC, GW, PD, PF sections)
- [ ] Cross-view consistency confirmed (XV-1 through XV-3)
- [ ] No double-prefix in any view (CC-10, PD-7, FMT-7 through FMT-11)
- [ ] Regression tests pass — unchanged views unaffected (REG-1 through REG-6)
- [ ] Data integrity confirmed — saved titles do not contain prefix (REG-5)
- [ ] No console errors or React warnings during any test
- [ ] Accessibility checks pass (A11Y-1 through A11Y-4)
- [ ] TypeScript compiles with zero errors
