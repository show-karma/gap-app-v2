"use client";

import { useQuery } from "@tanstack/react-query";
import type { Application } from "@/types/whitelabel-entities";
import fetchData from "@/utilities/fetchData";

interface UsePublicApplicationDetailsParams {
  referenceNumber: string;
  communityId: string;
  enabled?: boolean;
}

interface UsePublicApplicationDetailsReturn {
  application: Application | null;
  isLoading: boolean;
  error: Error | null;
  isPrivate: boolean;
  refetch: () => void;
}

export function usePublicApplicationDetails({
  referenceNumber,
  communityId,
  enabled = true,
}: UsePublicApplicationDetailsParams): UsePublicApplicationDetailsReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["public-application-details", referenceNumber, communityId],
    queryFn: async () => {
      if (!referenceNumber) {
        return { application: null, isPrivate: false };
      }

      const [response, fetchError] = await fetchData<Application & { message?: string }>(
        `/v2/funding-applications/${referenceNumber}`
      );

      if (fetchError) {
        if (fetchError.includes("private")) {
          return { application: null, isPrivate: true };
        }
        if (fetchError.includes("404")) {
          return { application: null, isPrivate: false };
        }
        throw new Error(fetchError);
      }

      if (
        response &&
        "message" in response &&
        typeof response.message === "string" &&
        response.message.includes("private")
      ) {
        return { application: null, isPrivate: true };
      }

      return {
        application: response ?? null,
        isPrivate: false,
      };
    },
    enabled: enabled && !!referenceNumber,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return {
    application: data?.application || null,
    isLoading,
    error: error as Error | null,
    isPrivate: data?.isPrivate || false,
    refetch,
  };
}
