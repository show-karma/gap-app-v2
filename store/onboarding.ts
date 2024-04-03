import { create } from "zustand";

export type OnboardingSteps =
  | "welcome"
  | "first"
  | "grants"
  | "updates"
  | "structure";

interface OnboardingStore {
  isOnboardingOpen: boolean;
  setIsOnboarding: (isOnboardingOpen: boolean) => void;
  onboardingStep: OnboardingSteps;
  changeOnboardingStep: (onboardingStep: OnboardingSteps) => void;
}

export const useOnboarding = create<OnboardingStore>((set, get) => ({
  isOnboardingOpen: false,
  setIsOnboarding: (isOnboardingOpen: boolean) =>
    set({ isOnboardingOpen, onboardingStep: "welcome" }),
  onboardingStep: "welcome",
  changeOnboardingStep: (onboardingStep: OnboardingSteps) => {
    set({ onboardingStep });
  },
}));
