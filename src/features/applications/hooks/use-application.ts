"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { Application } from "@/types/whitelabel-entities";
import fetchData from "@/utilities/fetchData";
import type { UseApplicationReturn } from "../types";

interface UseApplicationOptions {
  enabled?: boolean;
  initialData?: Application;
}

export function useApplication(
  communityId: string,
  applicationId: string | undefined,
  options: UseApplicationOptions = {}
): UseApplicationReturn {
  const { enabled = true, initialData } = options;
  const { authenticated, ready } = useAuth();

  const {
    data: application,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["application", communityId, applicationId, authenticated],
    queryFn: async () => {
      if (!applicationId) {
        throw new Error("Application ID is required");
      }
      const [response, fetchError] = await fetchData<Application>(
        `/v2/communities/${communityId}/applications/${applicationId}`
      );
      if (fetchError || !response) throw new Error(fetchError ?? "Application not found");
      return response;
    },
    enabled: !!applicationId && enabled && ready,
    initialData,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  return {
    application: application || null,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
