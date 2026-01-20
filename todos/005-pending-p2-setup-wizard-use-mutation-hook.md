---
status: completed
priority: p2
issue_id: "005"
tags: [code-review, architecture, react-query]
dependencies: []
---

# SetupWizard Direct Service Call Bypasses React Query

## Problem Statement

The `SetupWizard` component calls `fundingPlatformService.programs.toggleProgramStatus` directly instead of using a React Query mutation hook. This bypasses React Query's caching, error handling, and optimistic updates.

**Why it matters**: Direct service calls can cause stale data issues and inconsistent error handling compared to the rest of the codebase which uses React Query hooks.

## Findings

**Source**: Architecture Strategist Agent

**Location**: `/Users/mmurthy/dev/dapps/karma_protocol/super-gap-program-onboarding/gap-app-v2/components/FundingPlatform/SetupWizard/SetupWizard.tsx` (lines 30-49)

**Current Code**:
```typescript
const handleEnableProgram = async () => {
  // ...
  try {
    await fundingPlatformService.programs.toggleProgramStatus(programId, true);
    toast.success("Program enabled successfully!");
    router.push(returnUrl);
  } catch (error) {
    // ...
  }
};
```

**Codebase Pattern**: Other mutations use dedicated hooks like `useDeleteMilestone`, `useProgramReviewers.addReviewer`, etc.

## Proposed Solutions

### Option A: Create useToggleProgramStatus hook (Recommended)
Create a dedicated mutation hook following codebase patterns.

```typescript
// hooks/useToggleProgramStatus.ts
export function useToggleProgramStatus(programId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) =>
      fundingPlatformService.programs.toggleProgramStatus(programId, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-config', programId] });
    },
  });
}
```

**Pros**: Consistent with codebase patterns, automatic cache invalidation
**Cons**: New file to create
**Effort**: Low (1 hour)
**Risk**: Low

### Option B: Use existing useProgramConfig mutate
Check if useProgramConfig exposes update functionality.

**Pros**: No new files
**Cons**: May not have toggle functionality
**Effort**: Low (30 minutes)
**Risk**: Low

## Recommended Action

Option A - Create useToggleProgramStatus hook

## Technical Details

**Files to Create**:
- `hooks/useToggleProgramStatus.ts`

**Files to Modify**:
- `components/FundingPlatform/SetupWizard/SetupWizard.tsx`

**Query Keys to Invalidate**:
- `['program-config', programId]`

## Acceptance Criteria

- [ ] New hook `useToggleProgramStatus` created
- [ ] SetupWizard uses the hook instead of direct service call
- [ ] Cache is properly invalidated after toggle
- [ ] Loading and error states work correctly
- [ ] Test with enable/disable flow

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-19 | Created from code review | Architecture Strategist identified pattern violation |

## Resources

- PR Branch: `feat/phase5-ux-improvements-sidebar`
- React Query mutations: https://tanstack.com/query/latest/docs/react/guides/mutations
