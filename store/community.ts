import { create } from "zustand";

interface CommunityStore {
  totalProjects: number;
  setTotalProjects: (totalProjects: number) => void;
}

export const useCommunityStore = create<CommunityStore>((set, get) => ({
  totalProjects: 0,
  setTotalProjects: (totalProjects?: number) => set({ totalProjects }),
}));
