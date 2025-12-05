import type { ContributorProfile } from "@show-karma/karma-gap-sdk";
import { QueryClient } from "@tanstack/react-query";
import { create } from "zustand";
import { getProjectGrants } from "@/services/project-grants.service";
import type { ProjectResponse } from "@/types/v2/project";
import { envVars } from "@/utilities/enviromentVars";
import { INDEXER } from "@/utilities/indexer";
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
    // Fetch V2 project data directly
    const projectResponse = await fetch(
      `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.V2.PROJECTS.GET(project.details?.slug || project.uid)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!projectResponse.ok) {
      throw new Error(`HTTP error! status: ${projectResponse.status}`);
    }

    const projectData: ProjectResponse = await projectResponse.json();

    // Fetch grants separately (v2 doesn't include grants in project response)
    const grants = await getProjectGrants(projectData.details?.slug || project.uid);

    const refreshedProject: ProjectResponse = {
      ...projectData,
      grants: grants || [],
    };

    const currentGrantState = useGrantStore.getState();
    const shareSameGrant = refreshedProject.grants?.find(
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
