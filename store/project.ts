import { Contact } from "@/types/project";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { create } from "zustand";

interface ProjectStore {
  project: IProjectResponse | undefined;
  setProject: (project: IProjectResponse | undefined) => void;
  loading: boolean;
  refreshProject: () => Promise<IProjectResponse | undefined>;
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
  setProject: (project: IProjectResponse | undefined) => set({ project }),
  refreshProject: async () => {
    const { project } = get();
    if (!project) return;
    const refreshedProject = await gapIndexerApi
      .projectBySlug(project.uid)
      .then((res) => res.data);

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
