import { create } from "zustand";

interface ProjectCreateModalStore {
  isProjectCreateModalOpen: boolean;
  setIsProjectCreateModalOpen: (isProjectCreateModalOpen: boolean) => void;
  openProjectCreateModal: () => void;
  closeProjectCreateModal: () => void;
}

export const useProjectCreateModalStore = create<ProjectCreateModalStore>((set) => ({
  isProjectCreateModalOpen: false,
  setIsProjectCreateModalOpen: (isProjectCreateModalOpen: boolean) =>
    set({ isProjectCreateModalOpen }),
  openProjectCreateModal: () => set({ isProjectCreateModalOpen: true }),
  closeProjectCreateModal: () => set({ isProjectCreateModalOpen: false }),
}));
