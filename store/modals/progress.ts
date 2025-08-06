import { create } from "zustand";

export type ProgressModalScreen =
  | "menu"
  | "project_update"
  | "milestone"
  | "milestone_update"
  | "unified_milestone";

interface ProgressModalStore {
  isProgressModalOpen: boolean;
  setIsProgressModalOpen: (isProgressModalOpen: boolean) => void;
  progressModalScreen: ProgressModalScreen;
  setProgressModalScreen: (progressModalScreen: ProgressModalScreen) => void;
  closeProgressModal: () => void;
}

export const useProgressModalStore = create<ProgressModalStore>((set, get) => ({
  isProgressModalOpen: false,
  setIsProgressModalOpen: (isProgressModalOpen: boolean) =>
    set({ isProgressModalOpen }),
  progressModalScreen: "menu",
  setProgressModalScreen: (progressModalScreen: ProgressModalScreen) =>
    set({ progressModalScreen }),
  closeProgressModal: () =>
    set({
      isProgressModalOpen: false,
      progressModalScreen: "menu",
    }),
}));
