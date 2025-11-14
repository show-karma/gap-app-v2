import { create } from "zustand"

interface ProjectEditModalStore {
  isProjectEditModalOpen: boolean
  setIsProjectEditModalOpen: (isProjectEditModalOpen: boolean) => void
  openProjectEditModal: () => void
  closeProjectEditModal: () => void
}

export const useProjectEditModalStore = create<ProjectEditModalStore>((set, get) => ({
  isProjectEditModalOpen: false,
  setIsProjectEditModalOpen: (isProjectEditModalOpen: boolean) => set({ isProjectEditModalOpen }),
  openProjectEditModal: () => set({ isProjectEditModalOpen: true }),
  closeProjectEditModal: () => set({ isProjectEditModalOpen: false }),
}))
