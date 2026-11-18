import { create } from "zustand";
import { getProject } from "@/services/project.service";
import { getProjectGrants } from "@/services/project-grants.service";
import type { TeamProfile } from "@/types/team-profile";
import type { Project as ProjectResponse } from "@/types/v2/project";
import { refreshProjectQueries } from "@/utilities/queries/refreshProjectQueries";
import { queryClient } from "@/utilities/query-client";
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
  teamProfiles: TeamProfile[] | undefined;
  setTeamProfiles: (profiles: TeamProfile[] | undefined) => void;
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

    set({ project: refreshedProject });

    // The profile observes the project statically, which invalidation skips,
    // so the refreshed copy is written into its queries directly.
    await refreshProjectQueries(queryClient, {
      identifiers: [project.uid, project.details?.slug],
      project: refreshedProject,
      families: ["project"],
    });
    await queryClient.invalidateQueries({ queryKey: ["project"] });

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
