import { Contact } from "@/types/project";
import fetchData from "@/utilities/fetchData";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { INDEXER } from "@/utilities/indexer";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { create } from "zustand";
import { useGrantStore } from "./grant";

interface ProjectStore {
  project: IProjectResponse | undefined;
  setProject: (project: IProjectResponse | undefined) => void;
  loading: boolean;
  refreshProject: () => Promise<IProjectResponse | undefined>;
  refreshContactInfo: () => Promise<Contact[] | undefined>;
  setLoading: (loading: boolean) => void;
  isProjectAdmin: boolean;
  setIsProjectAdmin: (isProjectAdmin: boolean) => void;
  isProjectOwnerLoading: boolean;
  setIsProjectAdminLoading: (loading: boolean) => void;
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

    const currentGrantState = useGrantStore.getState();
    const shareSameGrant = refreshedProject.grants.find(
      (g) => g.uid.toLowerCase() === currentGrantState.grant?.uid?.toLowerCase()
    );

    if (shareSameGrant) {
      currentGrantState.setGrant(shareSameGrant);
    }

    set({ project: refreshedProject });

    return refreshedProject;
  },
  refreshContactInfo: async () => {
    const project = get();
    if (!project.project?.id) return;
    try {
      const [data] = await fetchData(
        INDEXER.SUBSCRIPTION.GET(project.project.uid),
        "GET",
        {},
        {},
        {},
        true
      );
      if (data) {
        set({ projectContactsInfo: data });
        console.log(data);
      }
      return data;
    } catch (error) {
      console.log(error);
    }
  },
  loading: false,
  setLoading: (loading: boolean) => set({ loading }),
  isProjectAdmin: false,
  setIsProjectAdmin: (isProjectAdmin: boolean) => set({ isProjectAdmin }),
  projectContactsInfo: undefined,
  setProjectContactsInfo: (contacts) => set({ projectContactsInfo: contacts }),
  contactInfoLoading: true,
  setContactInfoLoading: (value) => set({ contactInfoLoading: value }),
  isProjectOwnerLoading: true,
  setIsProjectAdminLoading: (loading: boolean) =>
    set({ isProjectOwnerLoading: loading }),
}));
