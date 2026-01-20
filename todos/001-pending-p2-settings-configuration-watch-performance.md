---
status: completed
priority: p2
issue_id: "001"
tags: [code-review, performance, react-hook-form]
dependencies: []
---

# Inefficient watch() Usage Causes Re-renders on Every Keystroke

## Problem Statement

The `SettingsConfiguration.tsx` component uses react-hook-form's `watch()` without parameters inside a `useEffect`, subscribing to ALL form field changes and triggering re-renders on every keystroke.

**Why it matters**: Every keystroke in email templates (which can be 1000+ characters) triggers a full re-render chain: form re-render → schema reconstruction → `onUpdate()` callback → parent component re-render. This causes severe input lag.

## Findings

**Source**: Performance Oracle Agent

**Location**: `/Users/mmurthy/dev/dapps/karma_protocol/super-gap-program-onboarding/gap-app-v2/components/QuestionBuilder/SettingsConfiguration.tsx` (lines 134-162)

**Current Code**:
```typescript
useEffect(() => {
  if (readOnly || !onUpdate) return;

  const subscription = watch((data) => {  // <-- watches ALL fields
    const updatedSchema: FormSchema = {
      ...schema,
      settings: { /* ... */ },
    };
    onUpdate(updatedSchema);  // <-- called on EVERY form change
  });

  return () => subscription.unsubscribe();
}, [watch, onUpdate, schema, readOnly]);
```

**Impact**: With complex email templates, this creates severe input lag.

## Proposed Solutions

### Option A: Debounced watch (Recommended)
Add 300ms debounce to onUpdate calls.

**Pros**: Simple to implement, maintains current behavior
**Cons**: Slight delay before changes are saved
**Effort**: Low (1-2 hours)
**Risk**: Low

### Option B: Watch specific fields only
Use `useWatch` with specific field names.

```typescript
const watchedFields = useWatch({
  control,
  name: ['privateApplications', 'donationRound', 'showCommentsOnPublicPage', 'accessCode'],
});
```

**Pros**: More efficient, only watches necessary fields
**Cons**: Need to manage email template saving separately
**Effort**: Medium (2-3 hours)
**Risk**: Medium

### Option C: Use onBlur mode
Change form mode to `onBlur` and use explicit save.

**Pros**: Most efficient, no intermediate saves
**Cons**: Changes UX - requires explicit save
**Effort**: Medium (2-3 hours)
**Risk**: Medium - changes user expectations

## Recommended Action

Option A - Add debounce

## Technical Details

**Affected Files**:
- `components/QuestionBuilder/SettingsConfiguration.tsx`

**Expected Gain**: 90% reduction in unnecessary re-renders during typing

## Acceptance Criteria

- [ ] Typing in email template fields is smooth without lag
- [ ] Form changes are still saved correctly
- [ ] No regression in form validation behavior
- [ ] Test with 1000+ character email templates

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-19 | Created from code review | Performance Oracle identified watch() cascade |

## Resources

- PR Branch: `feat/phase5-ux-improvements-sidebar`
- react-hook-form docs: https://react-hook-form.com/docs/usewatch
