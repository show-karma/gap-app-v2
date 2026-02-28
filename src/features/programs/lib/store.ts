import { create } from "zustand";
import type { FundingProgram, ProgramFilters } from "@/types/whitelabel-entities";
import type { ProgramsUIState } from "../types";

interface ProgramsStore extends ProgramsUIState {
  setSelectedProgram: (program: FundingProgram | null) => void;
  setFilters: (filters: ProgramFilters) => void;
  toggleViewMode: () => void;
  toggleFilterPanel: () => void;
  reset: () => void;
}

const initialState: ProgramsUIState = {
  selectedProgram: null,
  filters: {},
  viewMode: "grid",
  isFilterPanelOpen: false,
};

export const useProgramsStore = create<ProgramsStore>((set) => ({
  ...initialState,

  setSelectedProgram: (program) => set({ selectedProgram: program }),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
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
