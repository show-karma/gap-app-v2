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

- [x] Move `components/Utilities/Button.tsx` → `components/ui/button.tsx`
- [x] Move `components/Utilities/Card.tsx` → `components/ui/card.tsx` (from Disbursement)
- [x] Move `components/Utilities/Dropdown.tsx` → `components/ui/dropdown.tsx`
- [x] Move `components/Utilities/DropdownMultiple.tsx` → `components/ui/dropdown-multiple.tsx` (MultiSelectDropdown)
- [x] Move `components/UI/FileUpload.tsx` → `components/ui/file-upload.tsx`
- [x] Move `components/Utilities/DefaultLoading.tsx` → `components/ui/default-loading.tsx`
- [x] Move `components/Utilities/Loader.tsx` → `components/ui/table-loader.tsx`
- [x] Move `utilities/ReadMore.tsx` → `components/ui/read-more.tsx`
- [ ] Move `components/Utilities/SearchDropdown.tsx` → `components/ui/search-dropdown.tsx` (not found)
- [x] Move `components/Utilities/Tooltip.tsx` → `components/ui/tooltip.tsx` (InfoTooltip)
- [x] Move all loading/skeleton components to `components/ui/skeleton/`
- [x] Create base dialog components in `components/ui/dialog/` (BaseDialog, DialogTitle)
- [x] Move `components/Utilities/ExternalLink.tsx` → `components/ui/external-link.tsx`
- [x] Move `components/Utilities/Paragraph.tsx` → `components/ui/paragraph.tsx`
- [x] Move `components/Utilities/SmallHeading.tsx` → `components/ui/small-heading.tsx`
- [x] Move `components/Utilities/ProfilePicture.tsx` → `components/ui/profile-picture.tsx`
- [x] Move `components/Utilities/TransactionLink.tsx` → `components/ui/transaction-link.tsx`
- [x] Move `components/Utilities/Error.tsx` → `components/ui/error.tsx`
- [x] Move `components/Utilities/DynamicStars/*` → `components/ui/dynamic-stars/`
- [x] Move `components/Utilities/DatePicker.tsx` → `components/ui/date-picker.tsx`
- [x] Move `components/Utilities/MultiSelect.tsx` → `components/ui/multi-select.tsx`
- [x] Move `components/Utilities/Pagination.tsx` → `components/ui/pagination/pagination.tsx`
- [x] Move `components/Utilities/TablePagination.tsx` → `components/ui/pagination/table-pagination.tsx`
- [x] Move `components/Utilities/Tabs/*` → `components/ui/tabs/`
- [x] Move `components/Utilities/ChildrenBlur.jsx` → `components/ui/children-blur.tsx`
- [x] Move `components/Utilities/ImageTheme.tsx` → `components/ui/image-theme.tsx`
- [x] Move `components/Utilities/MarkdownEditor.tsx` → `components/ui/markdown-editor.tsx`
- [x] Move `components/Utilities/MarkdownPreview.tsx` → `components/ui/markdown-preview.tsx`
- [x] Move `components/Utilities/NotFound.tsx` → `components/ui/not-found.tsx`
- [x] Move `components/Utilities/Footer.tsx` → `components/layout/footer.tsx`
- [x] Move `components/Utilities/Header.tsx` → `components/layout/header.tsx`
- [x] Move `components/Utilities/WagmiProvider.tsx` → `components/providers/wagmi-provider.tsx`
- [x] Move `components/Utilities/HotjarAnalytics.tsx` → `lib/analytics/hotjar.tsx`

#### Generic Utilities Migration

- [x] Move `utilities/formatDate.ts` → `lib/format/date.ts`
- [x] Move `utilities/formatCurrency.ts` → `lib/format/currency.ts`
- [x] Move `utilities/shortAddress.ts` → `lib/format/address.ts`
- [x] Move `utilities/cn.ts` → `lib/utils/cn.ts` (from tailwind/index.ts)
- [x] Move `utilities/errorManager.ts` → `lib/utils/error-manager.ts`
- [x] Move `utilities/fetchData.ts` → `lib/utils/fetch-data.ts`
- [x] Move `utilities/misc.ts` → `lib/utils/misc.ts` (generateRandomString + zeroUID)
- [x] Move `utilities/mixpanel.ts` → `lib/analytics/mixpanel.ts` (mixpanelEvent.ts)
- [x] Move `utilities/sentry.ts` → `lib/monitoring/sentry.ts` (sentry/ignoreErrors.ts)
- [x] Move `utilities/formatNumber.ts` → `lib/format/number.ts`
- [x] Move `utilities/reduceText.ts` → `lib/utils/text.ts`
- [x] Move `utilities/sanitize.ts` → `lib/utils/sanitize.ts`
- [x] Move `utilities/cookies.ts` → `lib/utils/cookies.ts`
- [x] Move `utilities/regexs/*` → `lib/utils/regex.ts`
- [x] Move `utilities/auth-keys.ts` → `config/auth.ts`
- [x] Move `utilities/pages.ts` → `config/pages.ts`
- [x] Move `utilities/socials.ts` → `config/socials.ts`
- [x] Move `utilities/meta.ts` → `lib/meta.ts`
- [x] Move `utilities/markdown.ts` → `lib/markdown.ts`
- [x] Move `utilities/metadata/projectMetadata.ts` → `lib/metadata/project-metadata.ts`
- [x] Move `utilities/chainImgDictionary.ts` → `config/chains.ts` (consolidated)
- [x] Move `utilities/chainNameDictionary.ts` → `config/chains.ts` (consolidated)
- [x] Move `utilities/network.ts` → `config/network.ts`
- [x] Move `utilities/checkNetworkIsValid.ts` → `config/network.ts` (consolidated)
- [x] Move `utilities/messages.ts` → `config/messages.ts`
- [x] Move `utilities/tabs.tsx` → `lib/utils/tabs.tsx`
- [x] Move `utilities/wallet-helpers.ts` → `lib/utils/wallet-helpers.ts`
- [x] Move `utilities/retries.ts` → `lib/utils/retries.ts`
- [x] Move `utilities/fetchENS.ts` → `services/ens.ts`

#### Configuration Migration

- [x] Create `config/chains.ts` for chain configurations
- [x] Create `config/contracts.ts` for contract addresses
- [x] Create `config/abi/` directory and move all ABI files
- [x] Create `config/constants.ts` for app-wide constants
- [x] Move environment-specific configs to `config/env.ts`
- [x] Move `utilities/queries/defaultOptions.ts` → `config/query.ts`

#### Services Enhancement

- [x] Create `services/blockchain/` for Web3 abstractions
- [x] Move contract interaction logic to `services/blockchain/contracts/`
- [x] Create typed clients for each contract in `services/blockchain/`
- [ ] Ensure all external API calls go through services layer (to be completed during feature migrations)
- [x] Add proper TypeScript interfaces for all service methods
- [x] Move `utilities/wagmi/config.ts` → `services/blockchain/providers/wagmi-config.ts`
- [x] Move `utilities/eas-wagmi-utils.ts` → `services/blockchain/utils/eas-wagmi-utils.ts`
- [x] Move `utilities/rpcClient.ts` → `services/blockchain/providers/rpc-client.ts`
- [x] Move `utilities/sdk/getContractOwner.ts` → `services/blockchain/contracts/multicall.ts`
- [x] Create `services/blockchain/types.ts` with blockchain interfaces
- [x] Create `services/blockchain/index.ts` as entry point

#### Cross-Feature Hooks

- [x] Keep `hooks/useMediaQuery.ts` in root hooks
- [x] Keep `hooks/useCopyToClipboard.ts` in root hooks
- [x] Keep `hooks/usePagination.ts` in root hooks
- [x] Keep `hooks/useMixpanel.ts` in root hooks
- [ ] Move all feature-specific hooks to their respective features (plan created in hooks/README.md)

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

- [x] Move `components/Pages/Project/*` → `features/projects/components/`
- [x] Move `components/Pages/MyProjects/*` → `features/projects/components/my-projects/`
- [x] Move `components/Pages/NewProjects/*` → `features/projects/components/new-projects/`
- [x] Move `components/ProjectFeed.tsx` → `features/projects/components/project-feed.tsx`
- [ ] Move project-related dialogs from `components/Dialogs/` (planned for Phase 3)

#### Migrate Hooks

- [x] Move `hooks/useProject.ts` → `features/projects/hooks/use-project.ts`
- [x] Move `hooks/useProjectInstance.ts` → `features/projects/hooks/use-project-instance.ts`
- [x] Move `hooks/useProjectMembers.ts` → `features/projects/hooks/use-project-members.ts`
- [x] Move `hooks/useProjectPermissions.ts` → `features/projects/hooks/use-project-permissions.ts`
- [x] Move `hooks/useProjectSocials.ts` → `features/projects/hooks/use-project-socials.ts`
- [x] Move `hooks/useProjectMilestoneForm.ts` → `features/projects/hooks/use-project-milestone-form.ts`

#### Migrate Store & Types

- [x] Move `store/project.ts` → `features/projects/lib/store.ts`
- [x] Move `types/project.ts` → `features/projects/types.ts`
- [ ] Create `features/projects/api/` with project-specific API calls

#### Create Actions

- [ ] Extract server actions to `features/projects/actions.ts`
- [ ] Include create, update, delete project actions
- [ ] Include member management actions

### 2.2 Communities Feature

#### Create Feature Structure

- [x] Create `src/features/communities/` directory with standard subfolders

#### Migrate Components

- [x] Move `components/Pages/Communities/*` → `features/communities/components/`
- [x] Move `components/CommunitiesDropdown.tsx` → `features/communities/components/communities-dropdown.tsx`
- [x] Move `components/CommunitiesSelect.tsx` → `features/communities/components/communities-select.tsx`
- [x] Move `components/CommunityFeed.tsx` → `features/communities/components/community-feed.tsx`
- [x] Move `components/CommunityStats.tsx` → `features/communities/components/community-stats.tsx`

#### Migrate Hooks

- [x] Move `hooks/useCommunityDetails.ts` → `features/communities/hooks/use-community-details.ts`
- [x] Move `hooks/useCommunityCategory.ts` → `features/communities/hooks/use-community-category.ts`
- [x] Move `hooks/useIsCommunityAdmin.ts` → `features/communities/hooks/use-is-community-admin.ts`
- [x] Move `hooks/useAdminCommunities.ts` → `features/communities/hooks/use-admin-communities.ts`

#### Migrate Store & Types

- [x] Move `store/communities.ts` → `features/communities/lib/communities-store.ts`
- [x] Move `store/community.ts` → `features/communities/lib/community-store.ts`
- [x] Move `store/communityAdmin.ts` → `features/communities/lib/community-admin-store.ts`
- [x] Extract community types to `features/communities/types.ts`

### 2.3 Grants Feature

#### Create Feature Structure

- [x] Create `src/features/grants/` directory with standard subfolders

#### Migrate Components

- [x] Move `components/Pages/Grants/*` → `features/grants/components/`
- [x] Move `components/Pages/GrantMilestonesAndUpdates/*` → `features/grants/components/milestones-updates/`
- [ ] Move `components/GrantCard.tsx` → `features/grants/components/grant-card.tsx` (planned for Phase 3)
- [ ] Move `components/GrantsAccordion.tsx` → `features/grants/components/grants-accordion.tsx` (planned for Phase 3)
- [ ] Move `components/GrantProgramDropdown.tsx` → `features/grants/components/grant-program-dropdown.tsx` (planned for Phase 3)
- [ ] Move `components/GrantSizeSlider.tsx` → `features/grants/components/grant-size-slider.tsx` (planned for Phase 3)
- [ ] Move `components/CommunityGrants.tsx` → `features/grants/components/community-grants.tsx` (planned for Phase 3)

#### Migrate Hooks

- [x] Move `hooks/useGrant.ts` → `features/grants/hooks/use-grant.ts`
- [x] Move `hooks/useGrants.ts` → `features/grants/hooks/use-grants.ts`
- [ ] Move `hooks/useGrantsTable.ts` → `features/grants/hooks/use-grants-table.ts` (planned for Phase 3)
- [x] Move `hooks/useGrantMilestoneForm.ts` → `features/grants/hooks/use-grant-milestone-form.ts`

#### Migrate Store & Types

- [x] Move `store/grant.ts` → `features/grants/lib/store.ts`
- [x] Move `types/grant.ts` → `features/grants/types.ts`

## Phase 3: Migrate Supporting Features (Week 4)

### 3.1 Impact Measurement Feature

#### Create Feature Structure

- [x] Create `src/features/impact/` directory with standard subfolders

#### Migrate Components

- [x] Move `components/Pages/Communities/Impact/*` → `features/impact/components/community-impact/`
- [x] Move `components/Pages/Project/Impact/*` → `features/impact/components/project-impact/`
- [x] Move `components/Pages/Admin/ImpactPage.tsx` → `features/impact/components/admin/impact-page.tsx`

#### Migrate Hooks

- [x] Move `hooks/useImpactAnswers.ts` → `features/impact/hooks/use-impact-answers.ts`
- [x] Move `hooks/useImpactCommunityAggregate.ts` → `features/impact/hooks/use-impact-community-aggregate.ts`
- [x] Move `hooks/useImpactMeasurement.ts` → `features/impact/hooks/use-impact-measurement.ts`
- [x] Move `hooks/useIndicators.ts` → `features/impact/hooks/use-indicators.ts`
- [x] Move `hooks/useGroupedIndicators.ts` → `features/impact/hooks/use-grouped-indicators.ts`
- [x] Move `hooks/useUnlinkedIndicators.ts` → `features/impact/hooks/use-unlinked-indicators.ts`

#### Migrate Services & Types

- [x] Move `services/impactService.ts` → `features/impact/api/impact-service.ts`
- [x] Move `types/impactMeasurement.ts` → `features/impact/types.ts`

### 3.2 Milestones Feature

#### Create Feature Structure

- [x] Create `src/features/milestones/` directory with standard subfolders

#### Migrate Components

- [x] Move `components/Milestone/*` → `features/milestones/components/`
- [x] Move `components/Forms/Milestone.tsx` → `features/milestones/components/forms/milestone-form.tsx`
- [x] Move `components/Forms/MilestoneUpdate.tsx` → `features/milestones/components/forms/milestone-update-form.tsx`
- [x] Move `components/Forms/GrantMilestoneCompletion.tsx` → `features/milestones/components/forms/grant-milestone-completion.tsx`

#### Migrate Hooks

- [x] Move `hooks/useMilestone.ts` → `features/milestones/hooks/use-milestone.ts`
- [x] Move `hooks/useMilestoneActions.ts` → `features/milestones/hooks/use-milestone-actions.ts`
- [x] Move `hooks/useAllMilestones.ts` → `features/milestones/hooks/use-all-milestones.ts`

### 3.3 Admin Feature

#### Create Feature Structure

- [x] Create `src/features/admin/` directory with standard subfolders

#### Migrate Components

- [x] Move `components/Pages/Admin/*` → `features/admin/components/`
- [x] Organize by sub-feature (community-admin, super-admin, etc.)

### 3.4 Program Registry Feature

#### Create Feature Structure

- [x] Create `src/features/program-registry/` directory with standard subfolders

#### Migrate Components

- [x] Move `components/Pages/ProgramRegistry/*` → `features/program-registry/components/`

#### Migrate Hooks & Services

- [x] Move `hooks/usePrograms.ts` → `features/program-registry/hooks/use-programs.ts`
- [x] Move `services/programService.ts` → `features/program-registry/api/program-service.ts`
- [x] Move `services/programs.ts` → `features/program-registry/api/programs.ts`

#### Migrate Store & Types

- [x] Move `store/registry.ts` → `features/program-registry/lib/store.ts`
- [x] Create `features/program-registry/types.ts`

## Phase 4: Migrate Remaining Features (Week 5)

### 4.1 Authentication Feature

#### Create Feature Structure

- [x] Create `src/features/auth/` directory with standard subfolders

#### Migrate Hooks

- [x] Move `hooks/useAuth.ts` → `features/auth/hooks/use-auth.ts`
- [x] Move `hooks/useWallet.ts` → `features/auth/hooks/use-wallet.ts`

#### Migrate Store & Types

- [x] Move `store/auth.ts` → `features/auth/lib/store.ts`
- [x] Move `types/auth.ts` → `features/auth/types.ts`

#### Migrate Components

- [x] Move auth utilities to `features/auth/lib/`
- [x] Create `features/auth/actions.ts` for future server actions

### 4.2 Disbursements Feature

#### Create Feature Structure

- [x] Create `src/features/disbursements/` directory with standard subfolders

#### Migrate Components

- [x] Move `components/Disbursement/*` → `features/disbursements/components/`

#### Migrate Types

- [x] Move `types/disbursement.ts` → `features/disbursements/types.ts`
- [x] Create `features/disbursements/actions.ts` for future server actions

### 4.3 Stats & Analytics Feature

#### Create Feature Structure

- [x] Create `src/features/stats/` directory with standard subfolders

#### Migrate Components

- [x] Move `components/Pages/Stats/*` → `features/stats/components/`

#### Migrate Types

- [x] Move `types/stats.ts` → `features/stats/types.ts`
- [x] Create `features/stats/actions.ts` for future server actions

### 4.4 Feed Feature

#### Create Feature Structure

- [x] Create `src/features/feed/` directory with standard subfolders

#### Migrate Components

- [x] Move `components/Shared/ActivityCard/*` → `features/feed/components/activity-card/`
- [x] Move `components/Shared/ActivityList.tsx` → `features/feed/components/activity-list.tsx`
- [x] Move `components/Shared/ActivityCard.tsx` → `features/feed/components/activity-card.tsx`

#### Migrate Store & Types

- [x] Move `store/activityTab.ts` → `features/feed/lib/store.ts`
- [x] Move `types/feed.ts` → `features/feed/types.ts`
- [x] Create `features/feed/actions.ts` for future server actions

### 4.5 Search Feature

#### Create Feature Structure

- [x] Create `src/features/search/` directory with standard subfolders

#### Migrate Components

- [x] Move `components/Searchbar/*` → `features/search/components/`

#### Migrate Types

- [x] Move `types/explorer.ts` → `features/search/types.ts`
- [x] Create `features/search/actions.ts` for future server actions
- [x] Create `services/api/gap-indexer.ts` for API client

### 4.6 ENS Integration Feature

#### Create Feature Structure

- [x] Create `src/features/ens/` directory with standard subfolders

#### Migrate Components

- [x] Move `components/EthereumAddressToENSName.tsx` → `features/ens/components/address-to-ens-name.tsx`
- [x] Move `components/EthereumAddressToENSAvatar.tsx` → `features/ens/components/address-to-ens-avatar.tsx`

#### Migrate Store

- [x] Move `store/ens.ts` → `features/ens/lib/store.ts`
- [x] Create `features/ens/types.ts` with ENS-specific types
- [x] Create `features/ens/actions.ts` for future server actions

### 4.7 Tracks Feature

#### Create Feature Structure

- [x] Create `src/features/tracks/` directory with standard subfolders

#### Migrate Components

- [x] Move `components/Pages/Communities/Tracks/*` → `features/tracks/components/`
- [x] Move `components/Pages/Communities/TracksAdminPage.tsx` → `features/tracks/components/tracks-admin-page.tsx`
- [x] Move `components/TrackTags.tsx` → `features/tracks/components/track-tags.tsx`

#### Migrate Hooks & Services

- [x] Move `hooks/useTracks.ts` → `features/tracks/hooks/use-tracks.ts`
- [x] Move `services/tracks.ts` → `features/tracks/api/tracks.ts`
- [x] Create `features/tracks/types.ts` with track-specific types
- [x] Create `features/tracks/actions.ts` for future server actions

### 4.8 Payouts Feature

#### Create Feature Structure

- [x] Create `src/features/payouts/` directory with standard subfolders

#### Migrate Components

- [x] Move `components/Pages/Admin/PayoutsAdminPage.tsx` → `features/payouts/components/admin-page.tsx`
- [x] Move `components/Pages/Admin/PayoutsCsvUpload.tsx` → `features/payouts/components/csv-upload.tsx`

#### Migrate Hooks

- [x] Move `hooks/useCommunityPayouts.ts` → `features/payouts/hooks/use-community-payouts.ts`
- [x] Create `features/payouts/types.ts` with payout-specific types
- [x] Create `features/payouts/actions.ts` for future server actions

### 4.9 OSO Integration Feature

#### Create Feature Structure

- [x] Create `src/features/oso/` directory with standard subfolders

#### Migrate Components

- [x] Copy OSO metrics component → `features/oso/components/metrics.tsx`

#### Migrate Hooks & Types

- [x] Move `hooks/useOSOMetrics.ts` → `features/oso/hooks/use-oso-metrics.ts`
- [x] Move `types/oso.ts` → `features/oso/types.ts`
- [x] Create `features/oso/actions.ts` for future server actions

### 4.10 Modals Feature

#### Create Feature Structure

- [x] Create `src/features/modals/` directory with standard subfolders

#### Migrate Stores

- [x] Move all modal stores from `store/modals/*` → `features/modals/lib/stores/`
- [x] Move modal components from `components/Dialogs/*` → `features/modals/components/`
- [x] Create `features/modals/types.ts` with modal-specific types

## Phase 5: Update Imports & Clean Up (Week 6)

### 5.1 Update Import Paths

- [ ] Update all imports in app/ directory to use new feature paths
- [ ] Update all imports in remaining components to use new paths
- [ ] Update all cross-feature imports to use proper boundaries
- [ ] Update tsconfig.json path aliases if needed

### 5.2 Remove Old Directories

- [ ] Delete empty directories in components/Pages/
- [ ] Delete empty directories in components/
- [ ] Delete migrated files from hooks/
- [ ] Delete migrated files from store/
- [ ] Delete migrated files from types/
- [ ] Delete migrated files from utilities/

### 5.3 Update Documentation

- [ ] Update CLAUDE.md with new structure
- [ ] Update README.md with new structure
- [ ] Create feature-specific README files where helpful
- [ ] Update any developer documentation

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

- [ ] Create feature template structure
- [ ] Create component templates for common patterns
- [ ] Create hook templates

### 7.2 Update CI/CD

- [ ] Update linting rules for new structure
- [ ] Add checks for feature boundaries
- [ ] Update build scripts if needed

### 7.3 Team Training

- [ ] Document new patterns in CLAUDE.md
- [ ] Create examples of proper feature structure
- [ ] Define rules for cross-feature dependencies

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

- [ ] All tests passing
- [ ] No increase in bundle size
- [ ] Improved developer experience
- [ ] Clear feature boundaries
- [ ] Easier onboarding for new developers
- [ ] Reduced merge conflicts
- [ ] Faster feature development

## Notes

- Start with one feature at a time
- Run tests frequently during migration
- Commit after each successful feature migration
- Consider using feature flags during migration
- Keep the old structure working until migration is complete
