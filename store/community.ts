import { create } from "zustand";

interface CommunityStore {
	totalGrants: number;
	setTotalGrants: (totalGrants: number) => void;
}

export const useCommunityStore = create<CommunityStore>((set, get) => ({
	totalGrants: 0,
	setTotalGrants: (totalGrants?: number) => set({ totalGrants }),
}));
