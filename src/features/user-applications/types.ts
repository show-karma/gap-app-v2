import type { Application, ApplicationStatus } from "@/types/whitelabel-entities";

// Filter types for user applications
export interface UserApplicationsFilters {
  status?: ApplicationStatus | "all";
  programId?: string;
  searchQuery?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

// Sort options for user applications
export type UserApplicationsSortBy =
  | "createdAt"
  | "updatedAt"
  | "submittedAt"
  | "programName"
  | "status";

export type UserApplicationsSortOrder = "asc" | "desc";

// Pagination
export interface UserApplicationsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Store state
export interface UserApplicationsState {
  applications: Application[];
  filters: UserApplicationsFilters;
  sortBy: UserApplicationsSortBy;
  sortOrder: UserApplicationsSortOrder;
  pagination: UserApplicationsPagination;
  isLoading: boolean;
  error: Error | null;
  selectedApplicationId: string | null;
}

// Hook returns
export interface UseUserApplicationsReturn {
  applications: Application[];
  filters: UserApplicationsFilters;
  sortBy: UserApplicationsSortBy;
  sortOrder: UserApplicationsSortOrder;
  pagination: UserApplicationsPagination;
  isLoading: boolean;
  error: Error | null;
  setFilters: (filters: Partial<UserApplicationsFilters>) => void;
  setSort: (
    sortBy: UserApplicationsSortBy,
    sortOrder?: UserApplicationsSortOrder,
  ) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  refresh: () => void;
}

export interface UseUserApplicationReturn {
  application: Application | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

// API response types
export interface UserApplicationsResponse {
  applications: Application[];
  pagination: UserApplicationsPagination;
}
