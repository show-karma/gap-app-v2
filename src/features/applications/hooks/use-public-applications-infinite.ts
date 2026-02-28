"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import type { Application, ApplicationFilters } from "@/types/whitelabel-entities";
import fetchData from "@/utilities/fetchData";

interface UsePublicApplicationsInfiniteParams {
  programId: string;
  communityId: string;
  filters?: Omit<ApplicationFilters, "page" | "limit">;
  enabled?: boolean;
  pageSize?: number;
}

interface UsePublicApplicationsInfiniteReturn {
  applications: Application[];
  isLoading: boolean;
  error: Error | null;
  isPrivate: boolean;
  refetch: () => void;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  totalCount: number;
}

interface PageResponse {
  applications: Application[];
  isPrivate: boolean;
  hasMore: boolean;
  total: number;
}

export function usePublicApplicationsInfinite({
  programId,
  communityId,
  filters,
  enabled = true,
  pageSize = 32,
}: UsePublicApplicationsInfiniteParams): UsePublicApplicationsInfiniteReturn {
  const { data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["public-applications-infinite", programId, communityId, filters],
      queryFn: async ({ pageParam = 1 }): Promise<PageResponse> => {
        if (!programId) {
          return { applications: [], isPrivate: false, hasMore: false, total: 0 };
        }

        const queryParams = new URLSearchParams();
        queryParams.set("page", String(pageParam));
        queryParams.set("limit", String(pageSize));
        if (filters?.status) queryParams.set("status", filters.status);
        if (filters?.search) queryParams.set("search", filters.search);

        const url = `/v2/communities/${communityId}/programs/${programId}/applications?${queryParams.toString()}`;

        const [response, fetchError, pageInfo] = await fetchData<
          | Application[]
          | {
              applications: Application[];
              pagination?: { total: number; totalPages: number };
              message?: string;
            }
        >(url);

        if (fetchError) {
          if (fetchError.includes("private")) {
            return {
              applications: [],
              isPrivate: true,
              hasMore: false,
              total: 0,
            };
          }
          throw new Error(fetchError);
        }

        if (!response) {
          return { applications: [], isPrivate: false, hasMore: false, total: 0 };
        }

        if (
          !Array.isArray(response) &&
          "message" in response &&
          typeof response.message === "string" &&
          response.message.includes("private")
        ) {
          return { applications: [], isPrivate: true, hasMore: false, total: 0 };
        }

        let applications: Application[] = [];
        let total = 0;
        let hasMore = false;

        if (!Array.isArray(response) && "applications" in response) {
          applications = response.applications || [];
          total = response.pagination?.total || 0;
          hasMore = response.pagination
            ? pageParam < response.pagination.totalPages
            : applications.length === pageSize;
        } else if (Array.isArray(response)) {
          applications = response;
          total = response.length;
          hasMore = applications.length === pageSize;
        }

        return { applications, isPrivate: false, hasMore, total };
      },
      getNextPageParam: (lastPage, allPages) => {
        if (!lastPage.hasMore) return undefined;
        return allPages.length + 1;
      },
      initialPageParam: 1,
      enabled: enabled && !!programId,
      staleTime: 5 * 60 * 1000,
      retry: 1,
    });

  const applications = data?.pages.flatMap((page) => page.applications) || [];
  const isPrivate = data?.pages.some((page) => page.isPrivate) || false;
  const totalCount = data?.pages[0]?.total || 0;

  return {
    applications,
    isLoading,
    error: error as Error | null,
    isPrivate,
    refetch,
    fetchNextPage,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    totalCount,
  };
}
