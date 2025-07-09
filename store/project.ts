import { ContributorProfile } from "@show-karma/karma-gap-sdk";
import { create } from "zustand";

interface ProjectStore {
  isProjectAdmin: boolean;
  setIsProjectAdmin: (isProjectAdmin: boolean) => void;
  isProjectOwner: boolean;
  setIsProjectOwner: (isProjectOwner: boolean) => void;
  teamProfiles: ContributorProfile[] | undefined;
  setTeamProfiles: (profiles: ContributorProfile[] | undefined) => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  teamProfiles: undefined,
  setTeamProfiles: (profiles) => set({ teamProfiles: profiles }),
  isProjectAdmin: false,
  setIsProjectAdmin: (isProjectAdmin: boolean) => set({ isProjectAdmin }),
  isProjectOwner: false,
  setIsProjectOwner: (isProjectOwner: boolean) => set({ isProjectOwner }),
}));
