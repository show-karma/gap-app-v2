import { Contact } from "@/types/project";
import { getProjectById } from "@/utilities/sdk";
import type { Project } from "@show-karma/karma-gap-sdk";
import { create } from "zustand";

interface ProjectStore {
  project: Project | undefined;
  setProject: (project: Project | undefined) => void;
  loading: boolean;
  refreshProject: () => Promise<Project | undefined>;
  setLoading: (loading: boolean) => void;
  isProjectOwner: boolean;
  setIsProjectOwner: (isProjectOwner: boolean) => void;
  isProjectOwnerLoading: boolean;
  setIsProjectOwnerLoading: (loading: boolean) => void;
  projectContactsInfo: Contact[] | undefined;
  setProjectContactsInfo: (contacts: Contact[] | undefined) => void;
  contactInfoLoading: boolean;
  setContactInfoLoading: (value: boolean) => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  project: undefined,
  setProject: (project: Project | undefined) => set({ project }),
  refreshProject: async () => {
    const { project } = get();
    if (!project) return;
    const refreshedProject = await getProjectById(project.uid);

    set({ project: refreshedProject });
    return refreshedProject;
  },
  loading: false,
  setLoading: (loading: boolean) => set({ loading }),
  isProjectOwner: false,
  setIsProjectOwner: (isProjectOwner: boolean) => set({ isProjectOwner }),
  projectContactsInfo: undefined,
  setProjectContactsInfo: (contacts) => set({ projectContactsInfo: contacts }),
  contactInfoLoading: true,
  setContactInfoLoading: (value) => set({ contactInfoLoading: value }),
  isProjectOwnerLoading: true,
  setIsProjectOwnerLoading: (loading: boolean) =>
    set({ isProjectOwnerLoading: loading }),
}));
