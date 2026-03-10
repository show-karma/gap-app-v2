/**
 * Feature-scoped re-export of the KYC status hook.
 *
 * Implementation lives in hooks/useKycStatus.ts, which uses:
 * - fetchData (gap-app-v2 convention, not the whitelabel service layer)
 * - INDEXER.KYC.* endpoint constants
 * - Query keys scoped by communityUID to prevent cross-tenant cache collisions
 */
export {
  APPLICATION_REFERENCE_PREFIX,
  KYC_QUERY_KEYS,
  useKycBatchStatuses,
  useKycBatchStatusesByAppRef,
  useKycConfig,
  useKycStatus,
} from "@/hooks/useKycStatus";
