---
status: completed
priority: p3
issue_id: "009"
tags: [code-review, patterns, consistency]
dependencies: []
---

# Use cn() Utility Consistently for className Concatenation

## Problem Statement

Some files use string template concatenation for conditional classes instead of the `cn()` utility that's used throughout the codebase.

**Why it matters**: Consistency in code patterns makes the codebase easier to maintain and understand.

## Findings

**Source**: Pattern Recognition Specialist

**Example Location**: `gap-app-v2/components/FundingPlatform/QuestionBuilder/ProgramDetailsTab.tsx` (lines 446-448)

**Current Code**:
```typescript
buttonClassName={`${DATE_PICKER_BUTTON_CLASS} ${
  isDisabled ? "opacity-50 cursor-not-allowed" : ""
}`}
```

**Preferred**:
```typescript
buttonClassName={cn(DATE_PICKER_BUTTON_CLASS, isDisabled && "opacity-50 cursor-not-allowed")}
```

## Proposed Solutions

### Option A: Replace with cn() utility (Recommended)
Update all instances to use cn() for consistency.

**Pros**: Consistent, cleaner, handles edge cases better
**Cons**: Minor code changes
**Effort**: Low (30 minutes)
**Risk**: None

## Recommended Action

Option A - Replace with cn() utility

## Technical Details

**Files to Check/Modify**:
- `components/FundingPlatform/QuestionBuilder/ProgramDetailsTab.tsx`
- Any other files using template string concatenation

**Pattern to Replace**:
```typescript
// From
className={`${base} ${condition ? "class" : ""}`}

// To
className={cn(base, condition && "class")}
```

## Acceptance Criteria

- [ ] All conditional className uses cn() utility
- [ ] No string template concatenation for classes
- [ ] Styling works correctly

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-19 | Created from code review | Pattern Recognition found inconsistency |

## Resources

- PR Branch: `feat/phase5-ux-improvements-sidebar`
- cn() utility: `utilities/tailwind.ts`
