import { gapIndexerApi } from "@/services/gap-indexer/gap-indexer";
import { ContributorProfile } from "@show-karma/karma-gap-sdk";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { create } from "zustand";
import { useGrantStore } from "../../grants/lib/store";
import { QueryClient } from "@tanstack/react-query";
import { defaultQueryOptions } from "@/config/query";

interface ProjectStore {
  project: IProjectResponse | undefined;
  setProject: (project: IProjectResponse | undefined) => void;
  loading: boolean;
  refreshProject: () => Promise<IProjectResponse | undefined>;
  setLoading: (loading: boolean) => void;
  isProjectAdmin: boolean;
  setIsProjectAdmin: (isProjectAdmin: boolean) => void;
  isProjectOwner: boolean;
  setIsProjectOwner: (isProjectOwner: boolean) => void;
  teamProfiles: ContributorProfile[] | undefined;
  setTeamProfiles: (profiles: ContributorProfile[] | undefined) => void;
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
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: defaultQueryOptions,
      },
    });
    await queryClient.invalidateQueries({ queryKey: ["project"] });

    set({ project: refreshedProject });

    return refreshedProject;
  },
  teamProfiles: undefined,
  setTeamProfiles: (profiles) => set({ teamProfiles: profiles }),
  loading: false,
  setLoading: (loading: boolean) => set({ loading }),
  isProjectAdmin: false,
  setIsProjectAdmin: (isProjectAdmin: boolean) => set({ isProjectAdmin }),
  isProjectOwner: false,
  setIsProjectOwner: (isProjectOwner: boolean) => set({ isProjectOwner }),
}));
