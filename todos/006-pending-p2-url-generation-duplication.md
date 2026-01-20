---
status: completed
priority: p2
issue_id: "006"
tags: [code-review, architecture, duplication]
dependencies: []
---

# URL Generation Functions Duplicated Across Files

## Problem Statement

The same URL generation logic exists in multiple files, violating DRY principles. Both files define `getApplyUrlByCommunityId` with nearly identical logic.

**Why it matters**: Code duplication makes maintenance harder and increases risk of inconsistencies when logic needs to change.

## Findings

**Source**: Pattern Recognition Specialist, Architecture Strategist

**Duplicate Locations**:
1. `/Users/mmurthy/dev/dapps/karma_protocol/super-gap-program-onboarding/gap-app-v2/app/community/[communityId]/admin/funding-platform/page.tsx` (lines 46-57)
2. `/Users/mmurthy/dev/dapps/karma_protocol/super-gap-program-onboarding/gap-app-v2/components/QuestionBuilder/SettingsConfiguration.tsx` (lines 40-66)

**Functions duplicated**:
- `getApplyUrlByCommunityId(communityId, programId)` - near identical
- `getApplicationFormUrl(communityId, programId, accessCode?)` - in SettingsConfiguration

## Proposed Solutions

### Option A: Create shared utility (Recommended)
Create a dedicated utility file for funding platform URLs.

```typescript
// utilities/fundingPlatformUrls.ts
export function getApplyUrl(communityId: string, programId: string): string;
export function getBrowseApplicationsUrl(communityId: string, programId: string): string;
export function getGatedApplicationUrl(communityId: string, programId: string, accessCode?: string): string;
```

**Pros**: Single source of truth, easy to maintain
**Cons**: New file to manage
**Effort**: Low (1 hour)
**Risk**: Low

### Option B: Add to PAGES utility
Add to existing PAGES constant pattern used elsewhere.

**Pros**: Consistent with existing patterns
**Cons**: May bloat PAGES if it exists
**Effort**: Low (30 minutes)
**Risk**: Low

## Recommended Action

Option A - Create shared utility

## Technical Details

**Files to Create**:
- `utilities/fundingPlatformUrls.ts`

**Files to Modify**:
- `app/community/[communityId]/admin/funding-platform/page.tsx`
- `components/QuestionBuilder/SettingsConfiguration.tsx`
- `hooks/useProgramSetupProgress.ts` (also constructs URLs)

## Acceptance Criteria

- [ ] New utility file created with URL functions
- [ ] All duplicate URL logic removed
- [ ] Imports updated in consuming files
- [ ] URLs still work correctly
- [ ] Test both dev and prod domain logic

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-19 | Created from code review | Pattern Recognition found 3 duplications |

## Resources

- PR Branch: `feat/phase5-ux-improvements-sidebar`
- FUNDING_PLATFORM_DOMAINS: `src/features/funding-map/utils/funding-platform-domains.ts`
