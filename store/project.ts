import { getProjectById } from "@/utilities";
import { Project } from "@show-karma/karma-gap-sdk";
import { create } from "zustand";

interface ProjectStore {
  project: Project | undefined;
  setProject: (project: Project | undefined) => void;
  loading: boolean;
  refreshProject: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  isProjectOwner: boolean;
  setIsProjectOwner: (isProjectOwner: boolean) => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  project: undefined,
  setProject: (project: Project | undefined) => set({ project }),
  refreshProject: async () => {
    const { project } = get();
    if (!project) return;
    const refreshedProject = await getProjectById(project.uid);
    set({ project: refreshedProject });
  },
  loading: false,
  setLoading: (loading: boolean) => set({ loading }),
  isProjectOwner: false,
  setIsProjectOwner: (isProjectOwner: boolean) => set({ isProjectOwner }),
}));
