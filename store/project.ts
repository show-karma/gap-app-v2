import { Contact } from "@/types/project";
import fetchData from "@/utilities/fetchData";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { INDEXER } from "@/utilities/indexer";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { create } from "zustand";
import { useGrantStore } from "./grant";
import { ContributorProfile } from "@show-karma/karma-gap-sdk";
import { getContributorProfiles } from "@/utilities/indexer/getContributorProfiles";

interface ProjectStore {
  project: IProjectResponse | undefined;
  setProject: (project: IProjectResponse | undefined) => void;
  loading: boolean;
  refreshProject: () => Promise<IProjectResponse | undefined>;
  refreshContactInfo: () => Promise<Contact[] | undefined>;
  setLoading: (loading: boolean) => void;
  isProjectAdmin: boolean;
  setIsProjectAdmin: (isProjectAdmin: boolean) => void;
  isProjectOwner: boolean;
  setIsProjectOwner: (isProjectOwner: boolean) => void;
  isProjectOwnerLoading: boolean;
  setIsProjectAdminLoading: (loading: boolean) => void;
  projectContactsInfo: Contact[] | undefined;
  setProjectContactsInfo: (contacts: Contact[] | undefined) => void;
  contactInfoLoading: boolean;
  setContactInfoLoading: (value: boolean) => void;
  teamProfiles: ContributorProfile[] | undefined;
  setTeamProfiles: (profiles: ContributorProfile[] | undefined) => void;
  refreshMembers: () => Promise<ContributorProfile[] | undefined>;
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
  teamProfiles: undefined,
  setTeamProfiles: (profiles) => set({ teamProfiles: profiles }),
  refreshMembers: async () => {
    const { project } = get();
    if (!project) return undefined;
    const members = project.members.map((member) => member.recipient);
    const profiles = await getContributorProfiles(members);
    set({ teamProfiles: profiles });
    return profiles;
  },
  loading: false,
  setLoading: (loading: boolean) => set({ loading }),
  isProjectAdmin: false,
  setIsProjectAdmin: (isProjectAdmin: boolean) => set({ isProjectAdmin }),
  projectContactsInfo: undefined,
  setProjectContactsInfo: (contacts) => set({ projectContactsInfo: contacts }),
  isProjectOwner: false,
  setIsProjectOwner: (isProjectOwner: boolean) => set({ isProjectOwner }),
  contactInfoLoading: true,
  setContactInfoLoading: (value) => set({ contactInfoLoading: value }),
  isProjectOwnerLoading: true,
  setIsProjectAdminLoading: (loading: boolean) =>
    set({ isProjectOwnerLoading: loading }),
}));
