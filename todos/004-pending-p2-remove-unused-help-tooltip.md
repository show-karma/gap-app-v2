---
status: completed
priority: p2
issue_id: "004"
tags: [code-review, simplicity, dead-code]
dependencies: []
---

# Remove Unused HelpTooltip Component and HELP_CONTENT

## Problem Statement

The `HelpTooltip` component and `HELP_CONTENT` object are defined but never actually rendered. Only `EMAIL_PLACEHOLDERS` is used (by `PlaceholderReference.tsx`).

**Why it matters**: ~100 lines of unused code that was built for a planned feature that was never implemented.

## Findings

**Source**: Code Simplicity Reviewer Agent

**Location**: `/Users/mmurthy/dev/dapps/karma_protocol/super-gap-program-onboarding/gap-app-v2/components/FundingPlatform/HelpTooltip.tsx`

**Analysis**:
- `HelpTooltip` component (lines 15-72) - never rendered
- `HELP_CONTENT` object (lines 78-114) - never used
- `EMAIL_PLACEHOLDERS` (lines 119-148) - USED by PlaceholderReference.tsx
- `SettingsSidebar.tsx` imports `type HELP_CONTENT` only, no `<HelpTooltip>` JSX

## Proposed Solutions

### Option A: Move EMAIL_PLACEHOLDERS, delete rest (Recommended)
Move `EMAIL_PLACEHOLDERS` to `PlaceholderReference.tsx` where it's used, delete everything else.

**Pros**: Code locality, removes dead code
**Cons**: File restructuring
**Effort**: Low (30 minutes)
**Risk**: Low

### Option B: Delete unused portions only
Keep file but remove HelpTooltip and HELP_CONTENT.

**Pros**: Less change
**Cons**: Small file just for one export
**Effort**: Very Low (15 minutes)
**Risk**: Low

### Option C: Implement the help tooltips
Actually use the HelpTooltip in the sidebar.

**Pros**: Feature completion
**Cons**: Scope creep, not currently needed
**Effort**: High (4+ hours)
**Risk**: Medium

## Recommended Action

Option A - Move EMAIL_PLACEHOLDERS, delete rest

## Technical Details

**Changes**:
1. Move `EMAIL_PLACEHOLDERS` array to `PlaceholderReference.tsx`
2. Delete `HelpTooltip.tsx`
3. Update import in `PlaceholderReference.tsx`
4. Remove `helpKey` from `SettingsSidebar.tsx` items
5. Delete `HelpTooltip.test.tsx`

**LOC Reduction**: ~100 lines

## Acceptance Criteria

- [ ] EMAIL_PLACEHOLDERS moved to PlaceholderReference.tsx
- [ ] HelpTooltip.tsx deleted
- [ ] HelpTooltip.test.tsx deleted
- [ ] helpKey removed from SettingsSidebar items
- [ ] PlaceholderReference still works correctly
- [ ] No broken imports

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-19 | Created from code review | Code Simplicity Reviewer found YAGNI violation |

## Resources

- PR Branch: `feat/phase5-ux-improvements-sidebar`
