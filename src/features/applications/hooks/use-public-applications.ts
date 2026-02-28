"use client";

import { useQuery } from "@tanstack/react-query";
import type { Application, ApplicationFilters } from "@/types/whitelabel-entities";
import fetchData from "@/utilities/fetchData";

interface UsePublicApplicationsParams {
  programId: string;
  communityId: string;
  filters?: ApplicationFilters;
  enabled?: boolean;
}

interface UsePublicApplicationsReturn {
  applications: Application[];
  isLoading: boolean;
  error: Error | null;
  isPrivate: boolean;
  refetch: () => void;
}

export function usePublicApplications({
  programId,
  communityId,
  filters,
  enabled = true,
}: UsePublicApplicationsParams): UsePublicApplicationsReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["public-applications", programId, communityId, filters],
    queryFn: async () => {
      if (!programId) {
        return { applications: [], isPrivate: false };
      }

      const queryParams = new URLSearchParams();
      if (filters?.status) queryParams.set("status", filters.status);
      if (filters?.search) queryParams.set("search", filters.search);
      if (filters?.page) queryParams.set("page", String(filters.page));
      if (filters?.limit) queryParams.set("limit", String(filters.limit));

      const queryString = queryParams.toString();
      const url = `/v2/communities/${communityId}/programs/${programId}/applications${queryString ? `?${queryString}` : ""}`;

      const [response, fetchError] = await fetchData<
        Application[] | { applications: Application[]; message?: string }
      >(url);

      if (fetchError) {
        if (fetchError.includes("private")) {
          return { applications: [], isPrivate: true };
        }
        throw new Error(fetchError);
      }

      if (!response) {
        return { applications: [], isPrivate: false };
      }

      if (
        !Array.isArray(response) &&
        "message" in response &&
        typeof response.message === "string" &&
        response.message.includes("private")
      ) {
        return { applications: [], isPrivate: true };
      }

      if (!Array.isArray(response) && "applications" in response) {
        return {
          applications: response.applications || [],
          isPrivate: false,
        };
      }

      return {
        applications: Array.isArray(response) ? response : [],
        isPrivate: false,
      };
    },
    enabled: enabled && !!programId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return {
    applications: data?.applications || [],
    isLoading,
    error: error as Error | null,
    isPrivate: data?.isPrivate || false,
    refetch,
  };
}
