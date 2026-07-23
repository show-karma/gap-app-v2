import type { IMilestone } from "@show-karma/karma-gap-sdk";
import { create } from "zustand";
import { appNetwork } from "@/utilities/network";

export interface MilestonesForms {
  isValid: boolean;
  isEditing: boolean;
  data: IMilestone;
  /** Stable identity for React list rendering; assigned by the store. */
  formKey?: string;
}

let milestoneFormKeyCounter = 0;
const nextMilestoneFormKey = () => {
  milestoneFormKeyCounter += 1;
  return `milestone-form-${milestoneFormKeyCounter}`;
};

type FlowType = "grant" | "program";

interface GrantFormData {
  title: string;
  programId?: string;
  amount?: string;
  community: string;
  startDate?: Date;
  receivedDate?: Date;
  linkToProposal?: string;
  recipient?: string;
  description: string;
  questions?: {
    query: string;
    explanation?: string;
    type: string;
  }[];
  selectedTrackIds?: string[];
}

interface GrantFormStore {
  // Milestone management
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
  formPriorities: number[];
  setFormPriorities: (priorities: number[]) => void;

  // Multi-step flow management
  currentStep: number;
  setCurrentStep: (step: number) => void;
  flowType: FlowType;
  setFlowType: (type: FlowType) => void;

  // Form data
  formData: GrantFormData;
  updateFormData: (data: Partial<GrantFormData>) => void;
  resetFormData: () => void;

  communityNetworkId: number;
  setCommunityNetworkId: (networkId: number) => void;
}

const initialFormData: GrantFormData = {
  title: "",
  community: "",
  description: "",
  startDate: undefined,
  receivedDate: undefined,
  amount: "",
  linkToProposal: "",
  recipient: "",
  questions: [],
  selectedTrackIds: [],
};

export const useGrantFormStore = create<GrantFormStore>((set, get) => ({
  // Milestone management
  milestonesForms: [],
  createMilestone: () => {
    const { milestonesForms } = get();
    milestonesForms.push({
      isValid: false,
      isEditing: true,
      formKey: nextMilestoneFormKey(),
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
    const newMilestoneForm = milestonesForms.filter((_, i) => i !== index);
    set({ milestonesForms: newMilestoneForm });
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
    set({
      milestonesForms: milestonesForms.map((form) =>
        form.formKey ? form : { ...form, formKey: nextMilestoneFormKey() }
      ),
    }),
  isMilestonesFormsLoading: true,
  setIsMilestonesFormsLoading: (isMilestonesFormsLoading: boolean) =>
    set({ isMilestonesFormsLoading }),
  formPriorities: [],
  setFormPriorities: (priorities: number[]) => set({ formPriorities: priorities }),

  // Multi-step flow management
  currentStep: 1,
  setCurrentStep: (currentStep: number) => set({ currentStep }),
  flowType: "grant",
  setFlowType: (flowType: FlowType) => set({ flowType }),

  // Form data
  formData: initialFormData,
  updateFormData: (data: Partial<GrantFormData>) =>
    set((state) => ({ formData: { ...state.formData, ...data } })),
  resetFormData: () => set({ formData: initialFormData }),

  communityNetworkId: appNetwork[0].id,
  setCommunityNetworkId: (networkId: number) => set({ communityNetworkId: networkId }),
}));
