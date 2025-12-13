import type { ContributorProfile } from "@show-karma/karma-gap-sdk";
import { QueryClient } from "@tanstack/react-query";
import { create } from "zustand";
import { getProject } from "@/services/project.service";
import { getProjectGrants } from "@/services/project-grants.service";
import type { ProjectResponse } from "@/types/v2/project";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";
import { useGrantStore } from "./grant";

interface ProjectStore {
  project: ProjectResponse | undefined;
  setProject: (project: ProjectResponse | undefined) => void;
  loading: boolean;
  refreshProject: () => Promise<ProjectResponse | undefined>;
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
  setProject: (project: ProjectResponse | undefined) => set({ project }),
  refreshProject: async () => {
    const { project } = get();
    if (!project) return;

    const refreshedProject = await getProject(project.details?.slug || project.uid);
    if (!refreshedProject) return;

    // Refresh grants separately and update grant store if needed
    const currentGrantState = useGrantStore.getState();
    if (currentGrantState.grant?.uid) {
      const grants = await getProjectGrants(refreshedProject.details?.slug || refreshedProject.uid);
      const matchingGrant = grants?.find(
        (g) => g.uid.toLowerCase() === currentGrantState.grant?.uid?.toLowerCase()
      );
      if (matchingGrant) {
        currentGrantState.setGrant(matchingGrant);
      }
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
