import { create } from "zustand";

interface CommunityStore {
  totalProjects: number;
  totalGrants: number;
  totalMilestones: number;
  isLoadingFilters: boolean;
  setTotalProjects: (totalProjects: number) => void;
  setTotalGrants: (totalGrants: number) => void;
  setTotalMilestones: (totalMilestones: number) => void;
  setFilteredStats: (stats: {
    totalProjects?: number;
    totalGrants?: number;
    totalMilestones?: number;
  }) => void;
  setIsLoadingFilters: (isLoading: boolean) => void;
}

export const useCommunityStore = create<CommunityStore>((set, _get) => ({
  totalProjects: 0,
  totalGrants: 0,
  totalMilestones: 0,
  isLoadingFilters: false,
  setTotalProjects: (totalProjects?: number) => set({ totalProjects }),
  setTotalGrants: (totalGrants?: number) => set({ totalGrants }),
  setTotalMilestones: (totalMilestones?: number) => set({ totalMilestones }),
  setFilteredStats: (stats) =>
    set((state) => ({
      totalProjects: stats.totalProjects ?? state.totalProjects,
      totalGrants: stats.totalGrants ?? state.totalGrants,
      totalMilestones: stats.totalMilestones ?? state.totalMilestones,
    })),
  setIsLoadingFilters: (isLoadingFilters) => set({ isLoadingFilters }),
}));
