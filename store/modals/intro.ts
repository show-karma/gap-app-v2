import { create } from "zustand";

interface IntroModalStore {
  isIntroModalOpen: boolean;
  setIsIntroModalOpen: (isIntroModalOpen: boolean) => void;
}

export const useIntroModalStore = create<IntroModalStore>((set, _get) => ({
  isIntroModalOpen: false,
  setIsIntroModalOpen: (isIntroModalOpen: boolean) => set({ isIntroModalOpen }),
}));
