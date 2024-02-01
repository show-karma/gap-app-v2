import { create } from "zustand";

type Screen =
  | "milestones-and-updates"
  | "create-milestone"
  | "edit-milestone"
  | "create-grant"
  | "edit-grant"
  | "update-grant"
  | "complete-grant";

interface GrantScreensStore {
  grantScreen: Screen;
  setGrantScreen: (screen: Screen) => void;
}

export const useGrantScreensStore = create<GrantScreensStore>((set, get) => ({
  grantScreen: "milestones-and-updates",
  setGrantScreen: (screen: Screen) => set({ grantScreen: screen }),
}));
