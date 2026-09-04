import { create } from "zustand";
import { track } from "@/utilities/analytics/client";

export type OnboardingSteps = "welcome" | "project" | "grants" | "updates-milestones" | "structure";

/**
 * The last step of the walkthrough. Closing the dialog here is finishing it,
 * not abandoning it — which is the difference between the two events below.
 */
const FINAL_ONBOARDING_STEP: OnboardingSteps = "structure";

interface OnboardingStore {
  isOnboardingOpen: boolean;
  setIsOnboarding: (isOnboardingOpen: boolean) => void;
  onboardingStep: OnboardingSteps;
  changeOnboardingStep: (onboardingStep: OnboardingSteps) => void;
}

export const useOnboarding = create<OnboardingStore>((set, get) => ({
  isOnboardingOpen: false,
  setIsOnboarding: (isOnboardingOpen: boolean) => {
    // Closing a walkthrough that was open ends it one of two ways, and the step
    // it ended on is what tells them apart — so it is read before the reset
    // below. Closing on the last step is a completion; anywhere earlier is a
    // drop-off, and the step is the whole point of that event.
    if (!isOnboardingOpen && get().isOnboardingOpen) {
      const step = get().onboardingStep;
      if (step === FINAL_ONBOARDING_STEP) {
        track("onboarding_completed", {});
      } else {
        track("onboarding_dismissed", { step });
      }
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
