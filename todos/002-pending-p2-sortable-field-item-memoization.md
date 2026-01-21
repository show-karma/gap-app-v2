---
status: completed
priority: p2
issue_id: "002"
tags: [code-review, performance, react-memo]
dependencies: []
---

# Missing Memoization in SortableFieldItem Causes O(n) Re-renders

## Problem Statement

The `SortableFieldItem` component in `QuestionBuilder.tsx` is not memoized with `React.memo`. Every time `QuestionBuilder` re-renders, ALL field items re-render even if their props haven't changed.

**Why it matters**: With 10+ form fields (common in grant applications), each field update triggers 10+ unnecessary component re-renders, causing sluggish UI during form building.

## Findings

**Source**: Performance Oracle Agent, Pattern Recognition Specialist

**Location**: `gap-app-v2/components/QuestionBuilder/QuestionBuilder.tsx` (lines 874-1000)

**Current Behavior**:
- `SortableFieldItem` is defined as a regular function inside the component file
- No `React.memo` wrapper
- Each drag operation causes 10+ re-renders

**Scale Impact**:
| Scenario | Form Fields | Expected Render Time | Risk Level |
|----------|-------------|---------------------|------------|
| Current (10 fields) | 10 | ~50ms | Low |
| Medium (25 fields) | 25 | ~150ms | Medium |
| Large (50 fields) | 50 | ~400ms | High |

## Proposed Solutions

### Option A: Wrap with React.memo (Recommended)
Add React.memo wrapper and memoize callback props.

```typescript
const SortableFieldItem = React.memo(function SortableFieldItem({
  field,
  index,
  // ... other props
}: SortableFieldItemProps) {
  // ... implementation
});
```

**Pros**: Simple, effective
**Cons**: Requires memoizing callbacks in parent
**Effort**: Medium (2-3 hours)
**Risk**: Low

### Option B: Extract to separate file
Move `SortableFieldItem` to its own file with memo.

**Pros**: Cleaner file organization, easier testing
**Cons**: More file changes
**Effort**: Medium (2-3 hours)
**Risk**: Low

### Option C: Use useCallback for handlers
Add `useCallback` to `handleFieldUpdate`, `handleFieldDelete`, `handleFieldMove`.

**Pros**: Required for React.memo to work effectively
**Cons**: More boilerplate
**Effort**: Low (1-2 hours)
**Risk**: Low

## Recommended Action

Option A + Option C combined - Wrap with React.memo AND add useCallback

## Technical Details

**Affected Files**:
- `components/QuestionBuilder/QuestionBuilder.tsx`

**Handlers needing useCallback**:
- `handleFieldUpdate`
- `handleFieldDelete`
- `handleFieldMove`
- `handleTabChange`

## Acceptance Criteria

- [ ] SortableFieldItem wrapped with React.memo
- [ ] Callback props are memoized with useCallback
- [ ] Field updates don't re-render unchanged fields
- [ ] Drag and drop still works correctly
- [ ] Test with 50 fields to verify performance

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-19 | Created from code review | Performance Oracle + Pattern Recognition identified issue |

## Resources

- PR Branch: `feat/phase5-ux-improvements-sidebar`
- React.memo docs: https://react.dev/reference/react/memo
