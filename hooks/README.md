# Root Hooks Directory

This directory should only contain hooks that are truly generic and used across multiple features.

## Cross-Feature Hooks (Keep Here)
- `useMediaQuery.ts` - Media query detection
- `useCopyToClipboard.ts` - Clipboard functionality
- `usePagination.ts` - Generic pagination logic
- `useMixpanel.ts` - Analytics tracking

## Feature-Specific Hooks (To Be Moved)

### Projects Feature
- `useProject.ts`
- `useProjectInstance.ts`
- `useProjectMembers.ts`
- `useProjectPermissions.ts`
- `useProjectSocials.ts`
- `useProjectMilestoneForm.ts`

### Communities Feature
- `useCommunityDetails.ts`
- `useCommunityCategory.ts`
- `useIsCommunityAdmin.ts`
- `useAdminCommunities.ts`

### Grants Feature
- `useGrant.ts`
- `useGrants.ts`
- `useGrantsTable.ts`
- `useGrantMilestoneForm.ts`

### Impact Feature
- `useImpactAnswers.ts`
- `useImpactCommunityAggregate.ts`
- `useImpactMeasurement.ts`
- `useIndicators.ts`
- `useGroupedIndicators.ts`
- `useUnlinkedIndicators.ts`

### Milestones Feature
- `useMilestone.ts`
- `useMilestoneActions.ts`
- `useAllMilestones.ts`

### Auth Feature
- `useAuth.ts`
- `useWallet.ts`

### Other Features
- `useOSOMetrics.ts` → OSO feature
- `useTracks.ts` → Tracks feature
- `usePrograms.ts` → Program Registry feature
- `useCommunityPayouts.ts` → Payouts feature
- `useContractOwner.ts` → Blockchain services
- `useContactInfo.ts` → Contact feature
- `useContributorProfile.ts` → Profiles feature
- `useTeamProfiles.ts` → Profiles feature
- `useStaff.ts` → Admin feature
- `useUpdateActions.ts` → Updates feature
- `useInviteLink.ts` → Invites feature
- `useMemberRoles.ts` → Members feature
- `useCategories.ts` → Categories feature
- `useGap.ts` → Core GAP functionality