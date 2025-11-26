import { create } from "zustand";

interface MergeStore {
  isMergeModalOpen: boolean;
  setIsMergeModalOpen: (isMergeModalOpen: boolean) => void;
  openMergeModal: () => void;
  closeMergeModal: () => void;
}

export const useMergeModalStore = create<MergeStore>((set, _get) => ({
  isMergeModalOpen: false,
  setIsMergeModalOpen: (isMergeModalOpen: boolean) => set({ isMergeModalOpen }),
  openMergeModal: () => set({ isMergeModalOpen: true }),
  closeMergeModal: () => set({ isMergeModalOpen: false }),
}));
