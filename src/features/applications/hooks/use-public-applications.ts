"use client";

import { useQuery } from "@tanstack/react-query";
import type { Application, ApplicationFilters } from "@/types/whitelabel-entities";
import { api } from "@/utilities/api/client";
import { HttpError, isApiError } from "@/utilities/api/errors";

/**
 * Best-effort text extraction from a thrown ApiError, mirroring the
 * pre-migration `fetchData` error-string shape (backend body message, else
 * the ApiError's own message) so the "private" substring check below keeps
 * working the same way it did against the legacy tuple's error slot.
 */
function getErrorText(err: unknown): string {
  if (isApiError(err)) {
    if (err instanceof HttpError) {
      const bodyMessage = (err.body as { message?: string } | undefined)?.message;
      return bodyMessage || err.message;
    }
    return err.message;
  }
  return err instanceof Error ? err.message : String(err);
}

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
      const url = `/v2/funding-applications/program/${programId}${queryString ? `?${queryString}` : ""}`;

      try {
        // TODO(#1775): add zod schema
        const response = await api.get<
          Application[] | { applications: Application[]; message?: string }
        >(url);

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
      } catch (err) {
        if (getErrorText(err).includes("private")) {
          return { applications: [], isPrivate: true };
        }
        throw err;
      }
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
