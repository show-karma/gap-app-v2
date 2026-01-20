---
status: completed
priority: p2
issue_id: "003"
tags: [code-review, simplicity, dead-code]
dependencies: []
---

# Remove Unused Breadcrumbs Component (230 LOC Dead Code)

## Problem Statement

The `Breadcrumbs.tsx` component and its test file are not used anywhere in the application. They exist only for tests. This is 230 lines of dead code that adds maintenance burden.

**Why it matters**: Dead code increases maintenance cost, confuses developers, and bloats the codebase.

## Findings

**Source**: Code Simplicity Reviewer Agent

**Files to Remove**:
- `/Users/mmurthy/dev/dapps/karma_protocol/super-gap-program-onboarding/gap-app-v2/components/FundingPlatform/Breadcrumbs.tsx` (60 lines)
- `/Users/mmurthy/dev/dapps/karma_protocol/super-gap-program-onboarding/gap-app-v2/__tests__/components/FundingPlatform/Breadcrumbs.test.tsx` (170 lines)

**Evidence**:
- Searched for `Breadcrumbs` imports - only found in test file
- `SetupWizard` uses inline `Link` for "Back to Programs" instead

## Proposed Solutions

### Option A: Delete both files (Recommended)
Remove the component and test file entirely.

**Pros**: Clean codebase, no dead code
**Cons**: None - component is unused
**Effort**: Very Low (15 minutes)
**Risk**: None

### Option B: Keep for future use
Keep the component in anticipation of future needs.

**Pros**: Ready if needed later
**Cons**: YAGNI violation, maintenance burden
**Effort**: None
**Risk**: Low

## Recommended Action

Option A - Delete both files

## Technical Details

**Files to Delete**:
- `components/FundingPlatform/Breadcrumbs.tsx`
- `__tests__/components/FundingPlatform/Breadcrumbs.test.tsx`

**LOC Reduction**: 230 lines

## Acceptance Criteria

- [ ] Breadcrumbs.tsx is deleted
- [ ] Breadcrumbs.test.tsx is deleted
- [ ] No broken imports
- [ ] Build succeeds

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-19 | Created from code review | Code Simplicity Reviewer found YAGNI violation |

## Resources

- PR Branch: `feat/phase5-ux-improvements-sidebar`
