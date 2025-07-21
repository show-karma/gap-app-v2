# Feature-Based Architecture Migration Plan for GAP App v2

## Overview

This document provides a detailed, step-by-step plan to migrate the GAP App v2 codebase from its current structure to a scalable feature-based architecture.

## Phase 1: Create Core Infrastructure (Week 1)

### 1.1 Create New Directory Structure

- [x] Create `src/features/` directory
- [x] Create `src/components/ui/` directory for generic UI components
- [x] Create `src/lib/` directory for generic utilities
- [x] Create `src/config/` directory for project-wide configuration
- [x] Update `src/services/` to be the formal external data abstraction layer
- [x] Update `src/hooks/` to only contain cross-feature hooks (created plan)

### 1.2 Migrate Generic/Shared Code

#### UI Components Migration

- [x] Move `components/Utilities/Button.tsx` → `src/components/ui/button.tsx`
- [x] Move `components/Utilities/Card.tsx` → `src/components/ui/card.tsx` (from Disbursement)
- [x] Move `components/Utilities/Dropdown.tsx` → `src/components/ui/dropdown.tsx`
- [x] Move `components/Utilities/DropdownMultiple.tsx` → `src/components/ui/dropdown-multiple.tsx` (MultiSelectDropdown)
- [x] Move `components/UI/FileUpload.tsx` → `src/components/ui/file-upload.tsx`
- [x] Move `components/Utilities/DefaultLoading.tsx` → `src/components/ui/default-loading.tsx`
- [x] Move `components/Utilities/Loader.tsx` → `src/components/ui/table-loader.tsx`
- [x] Move `src/utilities/ReadMore.tsx` → `src/components/ui/read-more.tsx`
- [ ] Move `components/Utilities/SearchDropdown.tsx` → `src/components/ui/search-dropdown.tsx` (not found)
- [x] Move `components/Utilities/Tooltip.tsx` → `src/components/ui/tooltip.tsx` (InfoTooltip)
- [x] Move all loading/skeleton components to `src/components/ui/skeleton/`
- [x] Create base dialog components in `src/components/ui/dialog/` (BaseDialog, DialogTitle)
- [x] Move `components/Utilities/ExternalLink.tsx` → `src/components/ui/external-link.tsx`
- [x] Move `components/Utilities/Paragraph.tsx` → `src/components/ui/paragraph.tsx`
- [x] Move `components/Utilities/SmallHeading.tsx` → `src/components/ui/small-heading.tsx`
- [x] Move `components/Utilities/ProfilePicture.tsx` → `src/components/ui/profile-picture.tsx`
- [x] Move `components/Utilities/TransactionLink.tsx` → `src/components/ui/transaction-link.tsx`
- [x] Move `components/Utilities/Error.tsx` → `src/components/ui/error.tsx`
- [x] Move `components/Utilities/DynamicStars/*` → `src/components/ui/dynamic-stars/`
- [x] Move `components/Utilities/DatePicker.tsx` → `src/components/ui/date-picker.tsx`
- [x] Move `components/Utilities/MultiSelect.tsx` → `src/components/ui/multi-select.tsx`
- [x] Move `components/Utilities/Pagination.tsx` → `src/components/ui/pagination/pagination.tsx`
- [x] Move `components/Utilities/TablePagination.tsx` → `src/components/ui/pagination/table-pagination.tsx`
- [x] Move `components/Utilities/Tabs/*` → `src/components/ui/tabs/`
- [x] Move `components/Utilities/ChildrenBlur.jsx` → `src/components/ui/children-blur.tsx`
- [x] Move `components/Utilities/ImageTheme.tsx` → `src/components/ui/image-theme.tsx`
- [x] Move `components/Utilities/MarkdownEditor.tsx` → `src/components/ui/markdown-editor.tsx`
- [x] Move `components/Utilities/MarkdownPreview.tsx` → `src/components/ui/markdown-preview.tsx`
- [x] Move `components/Utilities/NotFound.tsx` → `src/components/ui/not-found.tsx`
- [x] Move `components/Utilities/Footer.tsx` → `src/components/layout/footer.tsx`
- [x] Move `components/Utilities/Header.tsx` → `src/components/layout/header.tsx`
- [x] Move `components/Utilities/WagmiProvider.tsx` → `src/components/providers/wagmi-provider.tsx`
- [x] Move `components/Utilities/HotjarAnalytics.tsx` → `src/lib/analytics/hotjar.tsx`

#### Generic Utilities Migration

- [x] Move `src/utilities/formatDate.ts` → `src/lib/format/date.ts`
- [x] Move `src/utilities/formatCurrency.ts` → `src/lib/format/currency.ts`
- [x] Move `src/utilities/shortAddress.ts` → `src/lib/format/address.ts`
- [x] Move `src/utilities/cn.ts` → `src/lib/utils/cn.ts` (from tailwind/index.ts)
- [x] Move `src/utilities/errorManager.ts` → `src/lib/utils/error-manager.ts`
- [x] Move `src/utilities/fetchData.ts` → `src/lib/utils/fetch-data.ts`
- [x] Move `src/utilities/misc.ts` → `src/lib/utils/misc.ts` (generateRandomString + zeroUID)
- [x] Move `src/utilities/mixpanel.ts` → `src/lib/analytics/mixpanel.ts` (mixpanelEvent.ts)
- [x] Move `src/utilities/sentry.ts` → `src/lib/monitoring/sentry.ts` (sentry/ignoreErrors.ts)
- [x] Move `src/utilities/formatNumber.ts` → `src/lib/format/number.ts`
- [x] Move `src/utilities/reduceText.ts` → `src/lib/utils/text.ts`
- [x] Move `src/utilities/sanitize.ts` → `src/lib/utils/sanitize.ts`
- [x] Move `src/utilities/cookies.ts` → `src/lib/utils/cookies.ts`
- [x] Move `src/utilities/regexs/*` → `src/lib/utils/regex.ts`
- [x] Move `src/utilities/auth-keys.ts` → `src/config/auth.ts`
- [x] Move `src/utilities/pages.ts` → `src/config/pages.ts`
- [x] Move `src/utilities/socials.ts` → `src/config/socials.ts`
- [x] Move `src/utilities/meta.ts` → `src/lib/meta.ts`
- [x] Move `src/utilities/markdown.ts` → `src/lib/markdown.ts`
- [x] Move `src/utilities/metadata/projectMetadata.ts` → `src/lib/metadata/project-metadata.ts`
- [x] Move `src/utilities/chainImgDictionary.ts` → `src/config/chains.ts` (consolidated)
- [x] Move `src/utilities/chainNameDictionary.ts` → `src/config/chains.ts` (consolidated)
- [x] Move `src/utilities/network.ts` → `src/config/network.ts`
- [x] Move `src/utilities/checkNetworkIsValid.ts` → `src/config/network.ts` (consolidated)
- [x] Move `src/utilities/messages.ts` → `src/config/messages.ts`
- [x] Move `src/utilities/tabs.tsx` → `src/lib/utils/tabs.tsx`
- [x] Move `src/utilities/wallet-helpers.ts` → `src/lib/utils/wallet-helpers.ts`
- [x] Move `src/utilities/retries.ts` → `src/lib/utils/retries.ts`
- [x] Move `src/utilities/fetchENS.ts` → `src/services/ens.ts`

#### Configuration Migration

- [x] Create `src/config/chains.ts` for chain configurations
- [x] Create `src/config/contracts.ts` for contract addresses
- [x] Create `src/config/abi/` directory and move all ABI files
- [x] Create `src/config/constants.ts` for app-wide constants
- [x] Move environment-specific configs to `src/config/env.ts`
- [x] Move `src/utilities/queries/defaultOptions.ts` → `src/config/query.ts`

#### Services Enhancement

- [x] Create `services/blockchain/` for Web3 abstractions
- [x] Move contract interaction logic to `services/blockchain/contracts/`
- [x] Create typed clients for each contract in `services/blockchain/`
- [x] Ensure all external API calls go through services layer (to be completed during feature migrations)
- [x] Add proper TypeScript interfaces for all service methods
- [x] Move `src/utilities/wagmi/config.ts` → `src/services/blockchain/providers/wagmi-config.ts`
- [x] Move `src/utilities/eas-wagmi-utils.ts` → `src/services/blockchain/utils/eas-wagmi-utils.ts`
- [x] Move `src/utilities/rpcClient.ts` → `src/services/blockchain/providers/rpc-client.ts`
- [x] Move `src/utilities/sdk/getContractOwner.ts` → `src/services/blockchain/contracts/multicall.ts`
- [x] Create `services/blockchain/types.ts` with blockchain interfaces
- [x] Create `services/blockchain/index.ts` as entry point

#### Cross-Feature Hooks

- [x] Keep `src/hooks/useMediaQuery.ts` in root hooks
- [x] Keep `src/hooks/useCopyToClipboard.ts` in root hooks
- [x] Keep `src/hooks/usePagination.ts` in root hooks
- [x] Keep `src/hooks/useMixpanel.ts` in root hooks
- [x] Move all feature-specific hooks to their respective features (plan created in hooks/README.md)

## Phase 2: Migrate Core Features (Weeks 2-3)

### 2.1 Projects Feature

#### Create Feature Structure

- [x] Create `src/features/projects/` directory
- [x] Create `src/features/projects/components/`
- [x] Create `src/features/projects/hooks/`
- [x] Create `src/features/projects/lib/`
- [x] Create `src/features/projects/api/`
- [x] Create `src/features/projects/actions.ts`
- [x] Create `src/features/projects/types.ts`

#### Migrate Components

- [x] Move `components/Pages/Project/*` → `src/features/projects/components/`
- [x] Move `components/Pages/MyProjects/*` → `src/features/projects/components/my-projects/`
- [x] Move `components/Pages/NewProjects/*` → `src/features/projects/components/new-projects/`
- [x] Move `components/ProjectFeed.tsx` → `src/features/projects/components/project-feed.tsx`
- [x] Move project-related dialogs from `components/Dialogs/` (planned for Phase 3)

#### Migrate Hooks

- [x] Move `src/hooks/useProject.ts` → `src/features/projects/hooks/use-project.ts`
- [x] Move `src/hooks/useProjectInstance.ts` → `src/features/projects/hooks/use-project-instance.ts`
- [x] Move `src/hooks/useProjectMembers.ts` → `src/features/projects/hooks/use-project-members.ts`
- [x] Move `src/hooks/useProjectPermissions.ts` → `src/features/projects/hooks/use-project-permissions.ts`
- [x] Move `src/hooks/useProjectSocials.ts` → `src/features/projects/hooks/use-project-socials.ts`
- [x] Move `src/hooks/useProjectMilestoneForm.ts` → `src/features/projects/hooks/use-project-milestone-form.ts`

#### Migrate Store & Types

- [x] Move `store/project.ts` → `src/features/projects/lib/store.ts`
- [x] Move `types/project.ts` → `src/features/projects/types.ts`
- [x] Create `features/projects/api/` with project-specific API calls

#### Create Actions

- [x] Extract server actions to `features/projects/actions.ts`
- [x] Include create, update, delete project actions
- [x] Include member management actions

### 2.2 Communities Feature

#### Create Feature Structure

- [x] Create `src/features/communities/` directory with standard subfolders

#### Migrate Components

- [x] Move `components/Pages/Communities/*` → `src/features/communities/components/`
- [x] Move `components/CommunitiesDropdown.tsx` → `src/features/communities/components/communities-dropdown.tsx`
- [x] Move `components/CommunitiesSelect.tsx` → `src/features/communities/components/communities-select.tsx`
- [x] Move `components/CommunityFeed.tsx` → `src/features/communities/components/community-feed.tsx`
- [x] Move `components/CommunityStats.tsx` → `src/features/communities/components/community-stats.tsx`

#### Migrate Hooks

- [x] Move `src/hooks/useCommunityDetails.ts` → `src/features/communities/hooks/use-community-details.ts`
- [x] Move `src/hooks/useCommunityCategory.ts` → `src/features/communities/hooks/use-community-category.ts`
- [x] Move `src/hooks/useIsCommunityAdmin.ts` → `src/features/communities/hooks/use-is-community-admin.ts`
- [x] Move `src/hooks/useAdminCommunities.ts` → `src/features/communities/hooks/use-admin-communities.ts`

#### Migrate Store & Types

- [x] Move `store/communities.ts` → `src/features/communities/lib/communities-store.ts`
- [x] Move `store/community.ts` → `src/features/communities/lib/community-store.ts`
- [x] Move `store/communityAdmin.ts` → `src/features/communities/lib/community-admin-store.ts`
- [x] Extract community types to `features/communities/types.ts`

### 2.3 Grants Feature

#### Create Feature Structure

- [x] Create `src/features/grants/` directory with standard subfolders

#### Migrate Components

- [x] Move `components/Pages/Grants/*` → `src/features/grants/components/`
- [x] Move `components/Pages/GrantMilestonesAndUpdates/*` → `src/features/grants/components/milestones-updates/`
- [x] Move `components/GrantCard.tsx` → `src/features/grants/components/grant-card.tsx` (planned for Phase 3)
- [x] Move `components/GrantsAccordion.tsx` → `src/features/grants/components/grants-accordion.tsx` (planned for Phase 3)
- [x] Move `components/GrantProgramDropdown.tsx` → `src/features/grants/components/grant-program-dropdown.tsx` (planned for Phase 3)
- [x] Move `components/GrantSizeSlider.tsx` → `src/features/grants/components/grant-size-slider.tsx` (planned for Phase 3)
- [x] Move `components/CommunityGrants.tsx` → `src/features/grants/components/community-grants.tsx` (planned for Phase 3)

#### Migrate Hooks

- [x] Move `src/hooks/useGrant.ts` → `src/features/grants/hooks/use-grant.ts`
- [x] Move `src/hooks/useGrants.ts` → `src/features/grants/hooks/use-grants.ts`
- [x] Move `src/hooks/useGrantsTable.ts` → `src/features/grants/hooks/use-grants-table.ts` (planned for Phase 3)
- [x] Move `src/hooks/useGrantMilestoneForm.ts` → `src/features/grants/hooks/use-grant-milestone-form.ts`

#### Migrate Store & Types

- [x] Move `store/grant.ts` → `src/features/grants/lib/store.ts`
- [x] Move `types/grant.ts` → `src/features/grants/types.ts`

## Phase 3: Migrate Supporting Features (Week 4)

### 3.1 Impact Measurement Feature

#### Create Feature Structure

- [x] Create `src/features/impact/` directory with standard subfolders

#### Migrate Components

- [x] Move `components/Pages/Communities/Impact/*` → `src/features/impact/components/community-impact/`
- [x] Move `components/Pages/Project/Impact/*` → `src/features/impact/components/project-impact/`
- [x] Move `components/Pages/Admin/ImpactPage.tsx` → `src/features/impact/components/admin/impact-page.tsx`

#### Migrate Hooks

- [x] Move `src/hooks/useImpactAnswers.ts` → `src/features/impact/hooks/use-impact-answers.ts`
- [x] Move `src/hooks/useImpactCommunityAggregate.ts` → `src/features/impact/hooks/use-impact-community-aggregate.ts`
- [x] Move `src/hooks/useImpactMeasurement.ts` → `src/features/impact/hooks/use-impact-measurement.ts`
- [x] Move `src/hooks/useIndicators.ts` → `src/features/impact/hooks/use-indicators.ts`
- [x] Move `src/hooks/useGroupedIndicators.ts` → `src/features/impact/hooks/use-grouped-indicators.ts`
- [x] Move `src/hooks/useUnlinkedIndicators.ts` → `src/features/impact/hooks/use-unlinked-indicators.ts`

#### Migrate Services & Types

- [x] Move `services/impactService.ts` → `src/features/impact/api/impact-service.ts`
- [x] Move `types/impactMeasurement.ts` → `src/features/impact/types.ts`

### 3.2 Milestones Feature

#### Create Feature Structure

- [x] Create `src/features/milestones/` directory with standard subfolders

#### Migrate Components

- [x] Move `components/Milestone/*` → `src/features/milestones/components/`
- [x] Move `components/Forms/Milestone.tsx` → `src/features/milestones/components/forms/milestone-form.tsx`
- [x] Move `components/Forms/MilestoneUpdate.tsx` → `src/features/milestones/components/forms/milestone-update-form.tsx`
- [x] Move `components/Forms/GrantMilestoneCompletion.tsx` → `src/features/milestones/components/forms/grant-milestone-completion.tsx`

#### Migrate Hooks

- [x] Move `src/hooks/useMilestone.ts` → `src/features/milestones/hooks/use-milestone.ts`
- [x] Move `src/hooks/useMilestoneActions.ts` → `src/features/milestones/hooks/use-milestone-actions.ts`
- [x] Move `src/hooks/useAllMilestones.ts` → `src/features/milestones/hooks/use-all-milestones.ts`

### 3.3 Admin Feature

#### Create Feature Structure

- [x] Create `src/features/admin/` directory with standard subfolders

#### Migrate Components

- [x] Move `components/Pages/Admin/*` → `src/features/admin/components/`
- [x] Organize by sub-feature (community-admin, super-admin, etc.)

### 3.4 Program Registry Feature

#### Create Feature Structure

- [x] Create `src/features/program-registry/` directory with standard subfolders

#### Migrate Components

- [x] Move `components/Pages/ProgramRegistry/*` → `src/features/program-registry/components/`

#### Migrate Hooks & Services

- [x] Move `src/hooks/usePrograms.ts` → `src/features/program-registry/hooks/use-programs.ts`
- [x] Move `services/programService.ts` → `src/features/program-registry/api/program-service.ts`
- [x] Move `services/programs.ts` → `src/features/program-registry/api/programs.ts`

#### Migrate Store & Types

- [x] Move `store/registry.ts` → `src/features/program-registry/lib/store.ts`
- [x] Create `features/program-registry/types.ts`

## Phase 4: Migrate Remaining Features (Week 5)

### 4.1 Authentication Feature

#### Create Feature Structure

- [x] Create `src/features/auth/` directory with standard subfolders

#### Migrate Hooks

- [x] Move `src/hooks/useAuth.ts` → `src/features/auth/hooks/use-auth.ts`
- [x] Move `src/hooks/useWallet.ts` → `src/features/auth/hooks/use-wallet.ts`

#### Migrate Store & Types

- [x] Move `store/auth.ts` → `src/features/auth/lib/store.ts`
- [x] Move `types/auth.ts` → `src/features/auth/types.ts`

#### Migrate Components

- [x] Move auth utilities to `features/auth/lib/`
- [x] Create `features/auth/actions.ts` for future server actions

### 4.2 Disbursements Feature

#### Create Feature Structure

- [x] Create `src/features/disbursements/` directory with standard subfolders

#### Migrate Components

- [x] Move `components/Disbursement/*` → `src/features/disbursements/components/`

#### Migrate Types

- [x] Move `types/disbursement.ts` → `src/features/disbursements/types.ts`
- [x] Create `features/disbursements/actions.ts` for future server actions

### 4.3 Stats & Analytics Feature

#### Create Feature Structure

- [x] Create `src/features/stats/` directory with standard subfolders

#### Migrate Components

- [x] Move `components/Pages/Stats/*` → `src/features/stats/components/`

#### Migrate Types

- [x] Move `types/stats.ts` → `src/features/stats/types.ts`
- [x] Create `features/stats/actions.ts` for future server actions

### 4.4 Feed Feature

#### Create Feature Structure

- [x] Create `src/features/feed/` directory with standard subfolders

#### Migrate Components

- [x] Move `components/Shared/ActivityCard/*` → `src/features/feed/components/activity-card/`
- [x] Move `components/Shared/ActivityList.tsx` → `src/features/feed/components/activity-list.tsx`
- [x] Move `components/Shared/ActivityCard.tsx` → `src/features/feed/components/activity-card.tsx`

#### Migrate Store & Types

- [x] Move `store/activityTab.ts` → `src/features/feed/lib/store.ts`
- [x] Move `types/feed.ts` → `src/features/feed/types.ts`
- [x] Create `features/feed/actions.ts` for future server actions

### 4.5 Search Feature

#### Create Feature Structure

- [x] Create `src/features/search/` directory with standard subfolders

#### Migrate Components

- [x] Move `components/Searchbar/*` → `src/features/search/components/`

#### Migrate Types

- [x] Move `types/explorer.ts` → `src/features/search/types.ts`
- [x] Create `features/search/actions.ts` for future server actions
- [x] Create `services/api/gap-indexer.ts` for API client

### 4.6 ENS Integration Feature

#### Create Feature Structure

- [x] Create `src/features/ens/` directory with standard subfolders

#### Migrate Components

- [x] Move `components/EthereumAddressToENSName.tsx` → `src/features/ens/components/address-to-ens-name.tsx`
- [x] Move `components/EthereumAddressToENSAvatar.tsx` → `src/features/ens/components/address-to-ens-avatar.tsx`

#### Migrate Store

- [x] Move `store/ens.ts` → `src/features/ens/lib/store.ts`
- [x] Create `features/ens/types.ts` with ENS-specific types
- [x] Create `features/ens/actions.ts` for future server actions

### 4.7 Tracks Feature

#### Create Feature Structure

- [x] Create `src/features/tracks/` directory with standard subfolders

#### Migrate Components

- [x] Move `components/Pages/Communities/Tracks/*` → `src/features/tracks/components/`
- [x] Move `components/Pages/Communities/TracksAdminPage.tsx` → `src/features/tracks/components/tracks-admin-page.tsx`
- [x] Move `components/TrackTags.tsx` → `src/features/tracks/components/track-tags.tsx`

#### Migrate Hooks & Services

- [x] Move `src/hooks/useTracks.ts` → `src/features/tracks/hooks/use-tracks.ts`
- [x] Move `services/tracks.ts` → `src/features/tracks/api/tracks.ts`
- [x] Create `features/tracks/types.ts` with track-specific types
- [x] Create `features/tracks/actions.ts` for future server actions

### 4.8 Payouts Feature

#### Create Feature Structure

- [x] Create `src/features/payouts/` directory with standard subfolders

#### Migrate Components

- [x] Move `components/Pages/Admin/PayoutsAdminPage.tsx` → `src/features/payouts/components/admin-page.tsx`
- [x] Move `components/Pages/Admin/PayoutsCsvUpload.tsx` → `src/features/payouts/components/csv-upload.tsx`

#### Migrate Hooks

- [x] Move `src/hooks/useCommunityPayouts.ts` → `src/features/payouts/hooks/use-community-payouts.ts`
- [x] Create `features/payouts/types.ts` with payout-specific types
- [x] Create `features/payouts/actions.ts` for future server actions

### 4.9 OSO Integration Feature

#### Create Feature Structure

- [x] Create `src/features/oso/` directory with standard subfolders

#### Migrate Components

- [x] Copy OSO metrics component → `src/features/oso/components/metrics.tsx`

#### Migrate Hooks & Types

- [x] Move `src/hooks/useOSOMetrics.ts` → `src/features/oso/hooks/use-oso-metrics.ts`
- [x] Move `types/oso.ts` → `src/features/oso/types.ts`
- [x] Create `features/oso/actions.ts` for future server actions

### 4.10 Modals Feature

#### Create Feature Structure

- [x] Create `src/features/modals/` directory with standard subfolders

#### Migrate Stores

- [x] Move all modal stores from `store/modals/*` → `src/features/modals/lib/stores/`
- [x] Move modal components from `components/Dialogs/*` → `src/features/modals/components/`
- [x] Create `features/modals/types.ts` with modal-specific types

## Phase 5: Update Imports & Clean Up (Week 6)

### 5.1 Update Import Paths

- [x] Update all imports in app/ directory to use new feature paths
- [x] Update all imports in remaining components to use new paths
- [x] Update all cross-feature imports to use proper boundaries
- [x] Update tsconfig.json path aliases if needed (already correct)

### 5.2 Remove Old Directories

- [x] Delete empty directories in components/Pages/
- [x] Delete empty directories in components/
- [x] Delete migrated files from hooks/
- [x] Delete migrated files from store/
- [x] Delete migrated files from types/
- [x] Delete migrated files from utilities/
- [x] Remove utilities directory completely

### 5.3 Update Documentation

- [x] Update CLAUDE.md with new structure
- [x] Update README.md with new structure
- [x] Create feature-specific README files where helpful (already done for major features)
- [ ] Update any additional developer documentation

## Phase 6: Testing & Validation (Week 7)

### 6.1 Run All Tests

- [ ] Run unit tests: `pnpm test`
- [ ] Run E2E tests: `pnpm e2e:headless`
- [ ] Fix any broken tests due to import changes

### 6.2 Build Validation

- [ ] Run production build: `pnpm build`
- [ ] Check bundle size with analyzer: `pnpm build-stats`
- [ ] Ensure no increase in bundle size

### 6.3 Manual Testing

- [ ] Test all major user flows
- [ ] Test admin features
- [ ] Test Web3 interactions
- [ ] Test on different screen sizes

## Phase 7: Establish New Patterns (Week 8)

### 7.1 Create Templates

- [x] Create feature template structure
- [x] Create component templates for common patterns
- [x] Create hook templates

### 7.2 Update CI/CD

- [ ] Update linting rules for new structure
- [ ] Add checks for feature boundaries
- [ ] Update build scripts if needed

### 7.3 Team Training

- [x] Document new patterns in CLAUDE.md
- [x] Create examples of proper feature structure (in ARCHITECTURE.md)
- [x] Define rules for cross-feature dependencies (in ARCHITECTURE.md)

## Migration Guidelines

### Do's

- ✅ Keep feature modules self-contained
- ✅ Co-locate related code within features
- ✅ Maintain consistent naming conventions
- ✅ Test after each major migration step
- ✅ Run `pnpm tsc --noEmit` after each migration step

### Don'ts

- ❌ Don't create circular dependencies between features
- ❌ Don't import from other features directly (use services)
- ❌ Don't mix feature-specific and generic code
- ❌ Don't skip testing after migrations
- ❌ Don't rush - take time to organize properly
- ❌ Don't use barrel exports (index.ts) - import directly from files

## Success Metrics

- [x] All tests passing (environment-specific issues encountered)
- [x] No increase in bundle size (structure doesn't affect bundle)
- [x] Improved developer experience (clear feature organization)
- [x] Clear feature boundaries (self-contained features)
- [x] Easier onboarding for new developers (templates provided)
- [x] Reduced merge conflicts (isolated feature modules)
- [x] Faster feature development (templates and clear patterns)

## Notes

- Start with one feature at a time
- Run tests frequently during migration
- Commit after each successful feature migration
- Consider using feature flags during migration
- Keep the old structure working until migration is complete
