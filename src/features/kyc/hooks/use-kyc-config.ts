import { useQuery } from "@tanstack/react-query";
import fetchData from "@/utilities/fetchData";
import type { KycConfigResponse } from "../types";

const KYC_CONFIG_STALE_TIME = 10 * 60 * 1000; // 10 minutes
const KYC_CONFIG_GC_TIME = 15 * 60 * 1000; // 15 minutes

export function useKycConfig(communityIdOrSlug: string | undefined) {
  const query = useQuery<KycConfigResponse | null, Error>({
    queryKey: ["kyc-config", communityIdOrSlug],
    queryFn: async () => {
      if (!communityIdOrSlug) return null;
      const [data, error] = await fetchData<KycConfigResponse>(
        `/v2/communities/${communityIdOrSlug}/kyc-config`
      );
      if (error) {
        // 404 means KYC not configured — return null instead of throwing
        if (typeof error === "string" && error.includes("Not Found")) {
          return null;
        }
        throw new Error(typeof error === "string" ? error : "Failed to fetch KYC config");
      }
      return data;
    },
    enabled: !!communityIdOrSlug,
    staleTime: KYC_CONFIG_STALE_TIME,
    gcTime: KYC_CONFIG_GC_TIME,
  });

  return {
    config: query.data,
    isEnabled: query.data?.isEnabled ?? false,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
