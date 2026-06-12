import type { FundingProgram, ProgramFilters } from "@/types/whitelabel-entities";

// UI State types
export interface ProgramsUIState {
  selectedProgram: FundingProgram | null;
  filters: ProgramFilters;
  viewMode: "grid" | "list";
  isFilterPanelOpen: boolean;
}

// Hook return types
export interface UseProgramsReturn {
  programs: FundingProgram[];
  loading: boolean;
  error: Error | null;
  filters: ProgramFilters;
  setFilters: (filters: ProgramFilters) => void;
  refetch: () => void;
  hasMore: boolean;
  totalCount: number;
}

export interface UseProgramReturn {
  program: FundingProgram | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}
