import { useQuery } from "@tanstack/react-query";
import fetchData from "@/utilities/fetchData";
import type { KycStatusResponse } from "../types";

const KYC_STATUS_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const KYC_STATUS_GC_TIME = 10 * 60 * 1000; // 10 minutes

const APPLICATION_REFERENCE_PREFIX = "APP-";

/**
 * Determine if identifier is an application reference (APP-...) vs project UID (0x...)
 */
const isApplicationReference = (identifier: string): boolean =>
  identifier.startsWith(APPLICATION_REFERENCE_PREFIX);

/**
 * Hook to fetch KYC verification status.
 *
 * Automatically uses the correct endpoint based on identifier type:
 * - Application references (APP-...) use /v2/funding-applications/:referenceNumber/kyc-status
 * - Project UIDs (0x...) use /v2/projects/:projectUID/communities/:communityUID/kyc-status
 *
 * @param identifier - Can be projectUID (0x...) or application referenceNumber (APP-...)
 * @param communityUID - Required only when identifier is a projectUID
 */
export function useKycStatus(identifier: string | undefined, communityUID: string | undefined) {
  const isAppRef = identifier ? isApplicationReference(identifier) : false;

  const query = useQuery<KycStatusResponse | null, Error>({
    queryKey: isAppRef
      ? ["kyc-status-by-app-ref", identifier ?? ""]
      : ["kyc-status", identifier ?? "", communityUID ?? ""],
    queryFn: async () => {
      if (!identifier) return null;

      if (isAppRef) {
        const [data, error, , status] = await fetchData<KycStatusResponse>(
          `/v2/funding-applications/${identifier}/kyc-status`
        );
        if (error) {
          // 404 means no KYC record exists yet — expected for new applications
          if (status === 404) return null;
          throw new Error(typeof error === "string" ? error : "Failed to fetch KYC status");
        }
        return data;
      }

      if (!communityUID) return null;
      const [data, error] = await fetchData<KycStatusResponse>(
        `/v2/projects/${identifier}/communities/${communityUID}/kyc-status`
      );
      if (error) {
        throw new Error(typeof error === "string" ? error : "Failed to fetch KYC status");
      }
      return data;
    },
    enabled: !!identifier && (isAppRef || !!communityUID),
    staleTime: KYC_STATUS_STALE_TIME,
    gcTime: KYC_STATUS_GC_TIME,
  });

  return {
    status: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
