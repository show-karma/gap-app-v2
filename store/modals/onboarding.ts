import { create } from "zustand";
import { track } from "@/utilities/analytics/client";

export type OnboardingSteps = "welcome" | "project" | "grants" | "updates-milestones" | "structure";

interface OnboardingStore {
  isOnboardingOpen: boolean;
  setIsOnboarding: (isOnboardingOpen: boolean) => void;
  onboardingStep: OnboardingSteps;
  changeOnboardingStep: (onboardingStep: OnboardingSteps) => void;
}

export const useOnboarding = create<OnboardingStore>((set, get) => ({
  isOnboardingOpen: false,
  setIsOnboarding: (isOnboardingOpen: boolean) => {
    // Closing a walkthrough that was open is a drop-off: the step it stopped on
    // is the whole point of the event, so it is read before the reset below.
    if (!isOnboardingOpen && get().isOnboardingOpen) {
      track("onboarding_dismissed", { step: get().onboardingStep });
    }
    set({ isOnboardingOpen });
    setTimeout(() => {
      set({ onboardingStep: "welcome" });
    }, 200);
  },
  onboardingStep: "welcome",
  changeOnboardingStep: (onboardingStep: OnboardingSteps) => {
    if (get().isOnboardingOpen) {
      track("onboarding_step_viewed", { step: onboardingStep });
    }
    set({ onboardingStep });
  },
}));
