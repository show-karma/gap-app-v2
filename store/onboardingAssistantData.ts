import { create } from "zustand";
import type { OnboardingData } from "@/components/Pages/OnboardingAssistant/types";

interface OnboardingAssistantDataStore {
  extractedData: OnboardingData | null;
  setExtractedData: (data: OnboardingData) => void;
  clearData: () => void;
}

export const useOnboardingAssistantDataStore = create<OnboardingAssistantDataStore>((set) => ({
  extractedData: null,
  setExtractedData: (data: OnboardingData) => set({ extractedData: data }),
  clearData: () => set({ extractedData: null }),
}));
