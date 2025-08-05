import { mixpanelEvent } from "@/utilities/mixpanelEvent";
import { Hex } from "viem";
import { create } from "zustand";

export type OnboardingSteps =
  | "welcome"
  | "project"
  | "grants"
  | "updates-milestones"
  | "structure";

interface OnboardingStore {
  isOnboardingOpen: boolean;
  setIsOnboarding: (isOnboardingOpen: boolean) => void;
  onboardingStep: OnboardingSteps;
  changeOnboardingStep: (onboardingStep: OnboardingSteps, address: Hex) => void;
}

export const useOnboarding = create<OnboardingStore>((set, get) => ({
  isOnboardingOpen: false,
  setIsOnboarding: (isOnboardingOpen: boolean) => {
    set({ isOnboardingOpen });
    setTimeout(() => {
      set({ onboardingStep: "welcome" });
    }, 200);
  },
  onboardingStep: "welcome",
  changeOnboardingStep: (onboardingStep: OnboardingSteps, address: string) => {
    if (get().isOnboardingOpen) {
      mixpanelEvent({
        event: "onboarding:navigation",
        properties: { address, id: onboardingStep },
      });
    }
    set({ onboardingStep });
  },
}));
