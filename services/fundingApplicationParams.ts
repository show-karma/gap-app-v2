import type { IApplicationFilters } from "@/services/fundingPlatformService";

type ReviewerFilters = Pick<IApplicationFilters, "reviewerAddress" | "reviewerAddresses">;

/**
 * Merges the single `reviewerAddress` and the `reviewerAddresses` list into one
 * de-duplicated array, for endpoints that accept a comma-separated
 * `reviewerAddresses` query param (statistics, export).
 */
const mergeReviewerAddresses = (filters: ReviewerFilters): string[] => {
  const addresses = [
    ...(filters.reviewerAddress ? [filters.reviewerAddress] : []),
    ...(filters.reviewerAddresses ?? []),
  ];
  return [...new Set(addresses)];
};

/**
 * Builds the URLSearchParams shared by the list and export endpoints: status,
 * search, date range, and sorting. Pagination and reviewer params differ per
 * endpoint and are appended by the caller.
 */
export const buildApplicationQueryParams = (filters: IApplicationFilters): URLSearchParams => {
  const params = new URLSearchParams();
  if (filters.status) params.append("status", filters.status);
  if (filters.search) params.append("search", filters.search);
  if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.append("dateTo", filters.dateTo);
  if (filters.sortBy) params.append("sortBy", filters.sortBy);
  if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);
  return params;
};

/**
 * Appends the de-duplicated reviewer addresses as a single comma-separated
 * `reviewerAddresses` param. Used by the statistics and export endpoints.
 */
export const appendMergedReviewerAddresses = (
  params: URLSearchParams,
  filters: ReviewerFilters
): void => {
  const addresses = mergeReviewerAddresses(filters);
  if (addresses.length) params.append("reviewerAddresses", addresses.join(","));
};
