import { create } from "zustand";

type Tab = "project-feed" | "endorsements";

interface ProjectActivityTabStore {
  activityTab: Tab;
  setActivityTab: (activityTab: Tab) => void;
}

export const useActivityTabStore = create<ProjectActivityTabStore>(
  (set, get) => ({
    activityTab: "project-feed",
    setActivityTab: (activityTab: Tab) => set({ activityTab }),
  })
);
