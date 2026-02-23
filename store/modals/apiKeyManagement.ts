import { create } from "zustand";

interface ApiKeyManagementStore {
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

export const useApiKeyManagementModalStore = create<ApiKeyManagementStore>((set) => ({
  isModalOpen: false,
  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),
}));
