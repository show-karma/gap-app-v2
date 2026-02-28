import { useQuery } from "@tanstack/react-query";
import type { Application } from "@/types/whitelabel-entities";
import fetchData from "@/utilities/fetchData";
import type { UseUserApplicationReturn } from "../types";

export function useUserApplication(
  applicationId: string | null,
  communityId: string
): UseUserApplicationReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["wl-user-application", communityId, applicationId],
    queryFn: async (): Promise<Application> => {
      if (!applicationId) {
        throw new Error("Application ID is required");
      }

      const [res, err] = await fetchData<Application>(
        `/v2/funding-applications/${applicationId}`,
        "GET"
      );
      if (err) throw new Error(err);
      if (!res) throw new Error("Application not found");
      return res;
    },
    enabled: !!applicationId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  return {
    application: data || null,
    isLoading,
    error: error as Error | null,
    refresh: refetch,
  };
}
