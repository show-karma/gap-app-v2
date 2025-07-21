# Utilities Migration Summary

## Completed Migrations

The following utilities have been successfully migrated to their appropriate feature locations:

### 1. Allo Protocol Utilities
- `utilities/allo-v2-queries/*` → `features/allo/api/`
- `utilities/allo/*` → `features/allo/lib/`

### 2. Karma GAP Utilities
- `utilities/karma/*` → `features/karma-gap/lib/`

### 3. Frames Utilities
- `utilities/frames/*` → `features/frames/lib/`

### 4. GAP Indexer API Utilities
- `utilities/gapIndexerApi/getAllMilestones.ts` → `features/milestones/api/`
- `utilities/gapIndexerApi/getGrantMilestones.ts` → `features/grants/api/`
- `utilities/gapIndexerApi/getCommunityBySlug.ts` → `features/communities/api/`
- `utilities/gapIndexerApi/getProjectObjectives.ts` → `features/projects/api/`
- `utilities/gapIndexerApi/index.ts` → `lib/services/gap-indexer-api.ts`

### 5. SDK Utilities
- `utilities/sdk/communities/*` → `features/communities/api/sdk/`
- `utilities/sdk/projects/*` → `features/projects/api/sdk/`
- `utilities/sdk/tracks/*` → `features/tracks/api/sdk/`
- `utilities/sdk/getContractOwner.ts` → `features/contract-owner/lib/get-contract-owner.ts`
- `utilities/sdk/getMetadata.ts` → `lib/services/metadata-service.ts`

### 6. Impact Utilities
- `utilities/impact/*` → `features/impact/lib/`

### 7. Registry Utilities
- `utilities/registry/*` → `features/program-registry/lib/`

### 8. Community Utilities
- `utilities/communityColors.ts` → `features/communities/lib/`
- `utilities/communityHelpers.ts` → `features/communities/lib/`
- `utilities/chosenCommunities.ts` → `features/communities/lib/`

### 9. Feed Utilities
- `utilities/feed.ts` → `features/feed/lib/`

## Remaining Utilities

The following utilities remain in the `src/utilities/` directory and may need further consideration:

### Core Utilities (Should remain in utilities/)
- `commons.ts` - Common constants and utilities
- `eas-wagmi-utils.ts` - EAS and Wagmi utilities
- `formatCurrency.ts`, `formatDate.ts`, `formatNumber.ts` - Formatting utilities
- `generateRandomString.ts` - General utility
- `reduceText.ts` - Text manipulation
- `shortAddress.ts` - Address formatting
- `checkExpirationStatus.ts` - Date validation
- `checkNetworkIsValid.ts` - Network validation

### Chain/Web3 Related (Consider moving to lib/web3/)
- `chainImgDictionary.ts`
- `chainNameDictionary.ts`
- `rpcClient.ts`
- `wagmi/config.ts`

### Auth Related (Consider moving to features/auth/lib/)
- `auth-keys.ts`
- `getCookiesFromStoredWallet.ts`
- `getWalletFromWagmiStore.ts`

### Project Related (Consider moving to features/projects/)
- `api/project.ts`
- `getProjectMemberRoles.ts`
- `metadata/projectMetadata.ts`

### Indexer Related (Consider moving to lib/indexer/)
- `indexer.ts`
- `indexer/getContributorProfiles.ts`
- `indexer/getExplorerProjects.ts`
- `indexer/getNewProjects.ts`
- `indexer/stats.ts`
- `gapIndexerClient/index.ts`

### Query Related (Consider moving to lib/queries/)
- `queries/defaultOptions.ts`
- `queries/getCommunityCategory.ts`
- `queries/getCommunityData.ts`
- `queries/getIndicatorsByCommunity.ts`
- `queries/getProjectCachedData.ts`
- `queries/getUnlinkedIndicators.ts`

### Other Utilities
- `donations/abi.ts` - Consider moving to config/abi/
- `downloadReports.ts` - Consider moving to features/reports/
- `fetchENS.ts` - Consider moving to features/ens/
- `mixpanelEvent.ts` - Consider moving to lib/analytics/
- `pages.ts`, `pagesOnRoot.ts` - Consider moving to config/
- `safe.ts` - Consider moving to features/safe/
- `share/*` - Consider moving to features/share/
- `subscribe/*` - Consider moving to features/subscribe/
- `tabs.tsx` - Consider moving to components/ui/
- `tailwind/*` - Consider moving to lib/styles/

## Import Updates

All imports have been automatically updated throughout the codebase to reflect the new locations of the migrated utilities.

## Next Steps

1. Consider migrating the remaining utilities based on the suggestions above
2. Review and test the application to ensure all imports are working correctly
3. Update any documentation that references the old utility locations