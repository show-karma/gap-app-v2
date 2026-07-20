import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { Application } from "@/types/whitelabel-entities";
import fetchData from "@/utilities/fetchData";
import { useUserApplicationsStore } from "../lib/store";
import type {
  UserApplicationsResponse,
  UserApplicationsSortBy,
  UseUserApplicationsReturn,
} from "../types";

// The my-applications endpoint does not accept sort params, so sorting is
// applied client-side over the fetched page. ISO date strings compare
// correctly as strings.
const SORT_FIELD: Record<UserApplicationsSortBy, (app: Application) => string> = {
  createdAt: (app) => app.createdAt ?? "",
  updatedAt: (app) => app.updatedAt ?? "",
  // Application has no submittedAt field; creation time is the closest proxy
  submittedAt: (app) => app.createdAt ?? "",
  programName: (app) => app.programTitle ?? "",
  status: (app) => app.status ?? "",
};

export function useUserApplications(
  communitySlug?: string,
  options?: { enabled?: boolean }
): UseUserApplicationsReturn {
  const queryClient = useQueryClient();
  const { address, authenticated } = useAuth();

  const {
    applications,
    filters,
    sortBy,
    sortOrder,
    pagination,
    statusCounts,
    setApplications,
    setFilters,
    setSort,
    setPage,
    setPageSize,
    setPagination,
    setStatusCounts,
    setLoading,
    setError,
  } = useUserApplicationsStore();

  // sortBy/sortOrder are intentionally NOT in the key: the endpoint doesn't
  // accept them, so including them refetches byte-identical data on every
  // header click. Sorting happens client-side below.
  const queryKey = [
    "wl-user-applications",
    communitySlug,
    address,
    filters,
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
    enabled: !!authenticated && (options?.enabled ?? true),
  });

  // Update store with query results
  useEffect(() => {
    setLoading(isLoading);
    setError(error as Error | null);

    if (data) {
      setApplications(data.applications);
      // The endpoint's wire format names this field `totalCount`, not
      // `total` (see gap-indexer's FundingApplicationApiMapper) — normalize
      // here so the rest of the app can keep reading the single `total`
      // field without silently falling back to a stale/zero value.
      setPagination({
        ...data.pagination,
        total: data.pagination.totalCount ?? data.pagination.total ?? 0,
      });
      setStatusCounts(data.statusCounts ?? {});
    }
  }, [
    data,
    isLoading,
    error,
    setApplications,
    setPagination,
    setStatusCounts,
    setLoading,
    setError,
  ]);

  // Prefetch next page
  useEffect(() => {
    if (data && pagination.page < pagination.totalPages) {
      const nextPageKey = [
        "wl-user-applications",
        communitySlug,
        address,
        filters,
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
    communitySlug,
    queryClient,
    address,
  ]);

  const sortedApplications = useMemo(() => {
    const getField = SORT_FIELD[sortBy] ?? SORT_FIELD.createdAt;
    const sorted = [...applications].sort((a, b) => getField(a).localeCompare(getField(b)));
    return sortOrder === "desc" ? sorted.reverse() : sorted;
  }, [applications, sortBy, sortOrder]);

  return {
    applications: sortedApplications,
    filters,
    sortBy,
    sortOrder,
    pagination,
    statusCounts,
    isLoading,
    error,
    setFilters,
    setSort,
    setPage,
    setPageSize,
    refresh: refetch,
  };
}
