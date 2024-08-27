import { IMilestone } from "@show-karma/karma-gap-sdk";
import { create } from "zustand";

interface MilestonesForms {
  isValid: boolean;
  isEditing: boolean;
  data: IMilestone;
}

interface GrantFormStore {
  milestonesForms: MilestonesForms[];
  setMilestonesForms: (milestonesForms: MilestonesForms[]) => void;
  isMilestonesFormsLoading: boolean;
  setIsMilestonesFormsLoading: (loading: boolean) => void;
  changeMilestoneForm: (index: number, newValue: MilestonesForms) => void;
  switchMilestoneEditing: (index: number) => void;
  createMilestone: () => void;
  removeMilestone: (index: number) => void;
  saveMilestone: (milestone: IMilestone, index: number) => void;
  clearMilestonesForms: () => void;
}

export const useGrantFormStore = create<GrantFormStore>((set, get) => ({
  milestonesForms: [],
  createMilestone: () => {
    const { milestonesForms } = get();
    milestonesForms.push({
      isValid: false,
      isEditing: true,
      data: {
        title: "",
        description: "",
        endsAt: 1,
      },
    });
    set({ milestonesForms: milestonesForms });
  },
  clearMilestonesForms: () => {
    set({ milestonesForms: [] });
  },
  removeMilestone: (index: number) => {
    const { milestonesForms } = get();
    milestonesForms.splice(index, 1);
    set({ milestonesForms: milestonesForms });
  },
  saveMilestone: (milestone: IMilestone, index: number) => {
    const { milestonesForms } = get();
    milestonesForms[index].data = milestone;
    milestonesForms[index].isValid = true;
    milestonesForms[index].isEditing = false;
    set({ milestonesForms: milestonesForms });
  },
  switchMilestoneEditing: (index: number) => {
    const { milestonesForms } = get();
    const oldEditing = milestonesForms[index].isEditing;
    milestonesForms[index].isEditing = !oldEditing;
    set({ milestonesForms: milestonesForms });
  },
  changeMilestoneForm: (index: number, newValue: MilestonesForms) => {
    const { milestonesForms } = get();
    milestonesForms[index] = newValue;
    set({ milestonesForms: milestonesForms });
  },
  setMilestonesForms: (milestonesForms: MilestonesForms[]) =>
    set({ milestonesForms }),
  isMilestonesFormsLoading: true,
  setIsMilestonesFormsLoading: (isMilestonesFormsLoading: boolean) =>
    set({ isMilestonesFormsLoading }),
}));
