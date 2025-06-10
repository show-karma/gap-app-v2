import { create } from "zustand";

interface SimilarProjectsModalStore {
  isSimilarProjectsModalOpen: boolean;
  setIsSimilarProjectsModalOpen: (isSimilarProjectsModalOpen: boolean) => void;
  openSimilarProjectsModal: () => void;
  closeSimilarProjectsModal: () => void;
}

export const useSimilarProjectsModalStore = create<SimilarProjectsModalStore>(
  (set) => ({
    isSimilarProjectsModalOpen: false,
    setIsSimilarProjectsModalOpen: (isSimilarProjectsModalOpen: boolean) =>
      set({ isSimilarProjectsModalOpen }),
    openSimilarProjectsModal: () => set({ isSimilarProjectsModalOpen: true }),
    closeSimilarProjectsModal: () => set({ isSimilarProjectsModalOpen: false }),
  })
);
