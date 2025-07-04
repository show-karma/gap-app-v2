import { create } from "zustand";

interface ContributorProfileStore {
  isModalOpen: boolean;
  targetAddress?: string;
  isEditing: boolean;
  setIsModalOpen: (isContributorProfileModalOpen: boolean) => void;
  openModal: (targetAddress?: string) => void;
  closeModal: () => void;
  setTargetAddress: (targetAddress: string) => void;
  setIsEditing: (isEditing: boolean) => void;
}

export const useContributorProfileModalStore = create<ContributorProfileStore>(
  (set) => ({
    isModalOpen: false,
    targetAddress: undefined,
    isEditing: false,
    setIsModalOpen: (isModalOpen: boolean) => set({ isModalOpen }),
    openModal: (targetAddress?: string) => {
      set({
        isModalOpen: true,
        targetAddress,
      });
    },
    closeModal: () => set({ isModalOpen: false, targetAddress: undefined }),
    setTargetAddress: (targetAddress: string) => set({ targetAddress }),
    setIsEditing: (isEditing: boolean) => set({ isEditing }),
  })
);
