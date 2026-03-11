import { create } from "zustand";
import type {
  UserApplicationsFilters,
  UserApplicationsSortBy,
  UserApplicationsSortOrder,
  UserApplicationsState,
} from "../types";

const initialState: UserApplicationsState = {
  applications: [],
  filters: {
    status: "all",
    programId: undefined,
    searchQuery: "",
    dateRange: undefined,
  },
  sortBy: "createdAt",
  sortOrder: "desc",
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
  isLoading: false,
  error: null,
  selectedApplicationId: null,
};

interface UserApplicationsStore extends UserApplicationsState {
  setApplications: (applications: UserApplicationsState["applications"]) => void;
  setFilters: (filters: Partial<UserApplicationsFilters>) => void;
  setSort: (sortBy: UserApplicationsSortBy, sortOrder?: UserApplicationsSortOrder) => void;
  setPagination: (pagination: Partial<UserApplicationsState["pagination"]>) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: Error | null) => void;
  setSelectedApplicationId: (id: string | null) => void;
  reset: () => void;
}

export const useUserApplicationsStore = create<UserApplicationsStore>((set) => ({
  ...initialState,

  setApplications: (applications) => set({ applications }),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
      pagination: { ...state.pagination, page: 1 },
    })),

  setSort: (sortBy, sortOrder) =>
    set((state) => ({
      sortBy,
      sortOrder:
        sortOrder ?? (state.sortBy === sortBy && state.sortOrder === "asc" ? "desc" : "asc"),
    })),

  setPagination: (pagination) =>
    set((state) => ({
      pagination: { ...state.pagination, ...pagination },
    })),

  setPage: (page) =>
    set((state) => ({
      pagination: { ...state.pagination, page },
    })),

  setPageSize: (limit) =>
    set((state) => ({
      pagination: { ...state.pagination, limit, page: 1 },
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  setSelectedApplicationId: (selectedApplicationId) => set({ selectedApplicationId }),

  reset: () => set(initialState),
}));
