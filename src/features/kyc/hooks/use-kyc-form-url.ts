/**
 * Feature-scoped re-export of the KYC form URL mutation hook.
 *
 * Implementation lives in hooks/useKycStatus.ts.
 * On success, invalidates both the project-based and batch status query key variants.
 */
export { useKycFormUrl } from "@/hooks/useKycStatus";
