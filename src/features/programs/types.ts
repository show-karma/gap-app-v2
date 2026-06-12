import type { FundingProgram, ProgramFilters } from "@/types/whitelabel-entities";

// UI State types
export interface ProgramsUIState {
  selectedProgram: FundingProgram | null;
  filters: ProgramFilters;
  viewMode: "grid" | "list";
  isFilterPanelOpen: boolean;
}

// Program Card Props
interface ProgramCardProps {
  program: FundingProgram;
  communityId: string;
  onApply?: (programId: string) => void;
  onViewDetails?: (programId: string) => void;
}

// Program List Props
interface ProgramListProps {
  programs: FundingProgram[];
  communityId: string;
  loading?: boolean;
  error?: Error | null;
  viewMode?: "grid" | "list";
  onRetry?: () => void;
  onApply?: (programId: string) => void;
  onViewDetails?: (programId: string) => void;
}

// Program Filters Props
interface ProgramFiltersProps {
  filters: ProgramFilters;
  onChange: (filters: ProgramFilters) => void;
  totalCount?: number;
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
