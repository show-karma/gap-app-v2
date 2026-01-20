---
status: completed
priority: p3
issue_id: "008"
tags: [code-review, performance, react]
dependencies: []
---

# Fix Default Set Creation in SettingsSidebar

## Problem Statement

The `completedSteps` prop has a default value that creates a new Set on every render, which could cause unnecessary re-renders in components that don't pass this prop.

**Why it matters**: Creating new objects in default props is a subtle performance issue that can cause unexpected re-renders.

## Findings

**Source**: Performance Oracle Agent

**Location**: `/Users/mmurthy/dev/dapps/karma_protocol/super-gap-program-onboarding/gap-app-v2/components/FundingPlatform/Sidebar/SettingsSidebar.tsx` (line 121)

**Current Code**:
```typescript
completedSteps = new Set(),  // <-- new object every render
```

## Proposed Solutions

### Option A: Module-level constant (Recommended)
Create a constant empty Set at module level.

```typescript
const EMPTY_SET = new Set<SidebarTabKey>();

// In component
completedSteps = EMPTY_SET,
```

**Pros**: Simple, prevents new object creation
**Cons**: None
**Effort**: Very Low (15 minutes)
**Risk**: None

## Recommended Action

Option A - Module-level constant

## Technical Details

**Files to Modify**:
- `components/FundingPlatform/Sidebar/SettingsSidebar.tsx`

## Acceptance Criteria

- [ ] Empty Set constant created at module level
- [ ] Default prop uses the constant
- [ ] Component still works correctly

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-19 | Created from code review | Performance Oracle identified subtle issue |

## Resources

- PR Branch: `feat/phase5-ux-improvements-sidebar`
