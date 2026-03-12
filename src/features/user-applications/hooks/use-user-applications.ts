import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { Application } from "@/types/whitelabel-entities";
import fetchData from "@/utilities/fetchData";
import { useUserApplicationsStore } from "../lib/store";
import type { UserApplicationsResponse, UseUserApplicationsReturn } from "../types";

export function useUserApplications(communitySlug?: string): UseUserApplicationsReturn {
  const queryClient = useQueryClient();
  const { address, authenticated } = useAuth();

  const {
    applications,
    filters,
    sortBy,
    sortOrder,
    pagination,
    setApplications,
    setFilters,
    setSort,
    setPage,
    setPageSize,
    setPagination,
    setLoading,
    setError,
  } = useUserApplicationsStore();

  const queryKey = [
    "wl-user-applications",
    communitySlug,
    address,
    filters,
    sortBy,
    sortOrder,
    pagination.page,
    pagination.limit,
  ];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async (): Promise<UserApplicationsResponse> => {
      const statusParam = filters.status === "all" ? "" : `&status=${filters.status}`;
      const searchParam = filters.searchQuery
        ? `&search=${encodeURIComponent(filters.searchQuery)}`
        : "";
      const programParam = filters.programId ? `&programId=${filters.programId}` : "";

      const communityParam = communitySlug ? `&communitySlug=${communitySlug}` : "";

      const [res, err] = await fetchData<UserApplicationsResponse>(
        `/v2/funding-applications/user/my-applications?page=${pagination.page}&limit=${pagination.limit}${communityParam}${statusParam}${searchParam}${programParam}`,
        "GET"
      );
      if (err) throw new Error(err);
      return res as UserApplicationsResponse;
    },
    staleTime: 1000 * 60 * 2,
    enabled: !!authenticated,
  });

  // Update store with query results
  useEffect(() => {
    setLoading(isLoading);
    setError(error as Error | null);

    if (data) {
      setApplications(data.applications);
      setPagination(data.pagination);
    }
  }, [data, isLoading, error, setApplications, setPagination, setLoading, setError]);

  // Prefetch next page
  useEffect(() => {
    if (data && pagination.page < pagination.totalPages) {
      const nextPageKey = [
        "wl-user-applications",
        communitySlug,
        address,
        filters,
        sortBy,
        sortOrder,
        pagination.page + 1,
        pagination.limit,
      ];

      const statusParam = filters.status === "all" ? "" : `&status=${filters.status}`;
      const searchParam = filters.searchQuery
        ? `&search=${encodeURIComponent(filters.searchQuery)}`
        : "";
      const programParam = filters.programId ? `&programId=${filters.programId}` : "";

      const communityParam = communitySlug ? `&communitySlug=${communitySlug}` : "";

      queryClient.prefetchQuery({
        queryKey: nextPageKey,
        queryFn: async () => {
          const [res, err] = await fetchData<UserApplicationsResponse>(
            `/v2/funding-applications/user/my-applications?page=${pagination.page + 1}&limit=${pagination.limit}${communityParam}${statusParam}${searchParam}${programParam}`,
            "GET"
          );
          if (err) throw new Error(err);
          return res;
        },
        staleTime: 1000 * 60 * 2,
      });
    }
  }, [
    data,
    pagination.page,
    pagination.totalPages,
    pagination.limit,
    filters,
    sortBy,
    sortOrder,
    communitySlug,
    queryClient,
    address,
  ]);

  return {
    applications,
    filters,
    sortBy,
    sortOrder,
    pagination,
    isLoading,
    error,
    setFilters,
    setSort,
    setPage,
    setPageSize,
    refresh: refetch,
  };
}
