import { create } from "zustand";
import type { FundingProgram, ProgramFilters } from "@/types/whitelabel-entities";
import type { ProgramsUIState } from "../types";

interface ProgramsStore extends ProgramsUIState {
  hasUserChangedFilters: boolean;
  setSelectedProgram: (program: FundingProgram | null) => void;
  setFilters: (filters: ProgramFilters) => void;
  // Internal: applies a default-derived filter change without marking it as a user interaction.
  applyAutoFilters: (filters: ProgramFilters) => void;
  toggleViewMode: () => void;
  toggleFilterPanel: () => void;
  reset: () => void;
}

const initialState: ProgramsUIState & { hasUserChangedFilters: boolean } = {
  selectedProgram: null,
  filters: { status: "active" },
  viewMode: "grid",
  isFilterPanelOpen: false,
  hasUserChangedFilters: false,
};

export const useProgramsStore = create<ProgramsStore>((set) => ({
  ...initialState,

  setSelectedProgram: (program) => set({ selectedProgram: program }),

  setFilters: (filters) =>
    set(() => ({
      filters,
      hasUserChangedFilters: true,
    })),

  applyAutoFilters: (filters) =>
    set(() => ({
      filters,
    })),

  toggleViewMode: () =>
    set((state) => ({
      viewMode: state.viewMode === "grid" ? "list" : "grid",
    })),

  toggleFilterPanel: () =>
    set((state) => ({
      isFilterPanelOpen: !state.isFilterPanelOpen,
    })),

  reset: () => set(initialState),
}));
