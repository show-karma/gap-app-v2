---
status: pending
priority: p3
issue_id: "010"
tags: [code-review, agent-native, api]
dependencies: []
---

# Expose Setup Progress via API for Agent Accessibility

## Problem Statement

The setup progress (completed steps, missing required fields, readiness to enable) is computed client-side in `useProgramSetupProgress`. Agents cannot programmatically check if a program is ready to enable without replicating this logic.

**Why it matters**: Agents need to be able to ask "is this program ready to enable?" without browser automation or replicating complex client logic.

## Findings

**Source**: Agent-Native Reviewer

**Location**: `gap-app-v2/hooks/useProgramSetupProgress.ts`

**Agent-Native Score**: 57% (8/14 capabilities accessible)

**Key Gap**: Setup progress is computed from multiple API calls client-side. An agent would need to:
1. Call `GET /v2/funding-program-configs/{programId}`
2. Call `GET /v2/programs/{programId}/reviewers`
3. Replicate the step completion logic

## Proposed Solutions

### Option A: Create backend endpoint (Recommended)
Add `GET /v2/funding-program-configs/{programId}/setup-status`

**Response**:
```typescript
{
  steps: SetupStep[];
  completedCount: number;
  totalRequired: number;
  isReadyToEnable: boolean;
  missingRequired: string[];
  percentComplete: number;
}
```

**Pros**: Single source of truth, agent-friendly
**Cons**: Backend work required
**Effort**: Medium (4-6 hours)
**Risk**: Low

### Option B: Document URL navigation patterns
Document the tab query parameters for browser automation.

**Pros**: Quick documentation fix
**Cons**: Doesn't solve API gap
**Effort**: Low (1 hour)
**Risk**: None

### Option C: Include in existing config response
Add setup status to `GET /v2/funding-program-configs/{programId}` response.

**Pros**: No new endpoint
**Cons**: Bloats existing response
**Effort**: Medium (3-4 hours)
**Risk**: Low

## Recommended Action

Option A for comprehensive solution, Option B as interim documentation

## Technical Details

**Backend Files to Create/Modify**:
- New endpoint in funding platform routes
- Service method for setup status calculation

**Frontend Files to Update**:
- `hooks/useProgramSetupProgress.ts` - could call API instead of computing

## Acceptance Criteria

- [ ] API endpoint returns setup status
- [ ] Response matches useProgramSetupProgress output
- [ ] Agent can check readiness with single API call
- [ ] Documentation updated with URL patterns

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-19 | Created from code review | Agent-Native Reviewer identified gap |

## Resources

- PR Branch: `feat/phase5-ux-improvements-sidebar`
- useProgramSetupProgress hook: shows required calculations
