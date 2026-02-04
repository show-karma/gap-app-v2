import { create } from "zustand";

interface OnboardingAssistantModalStore {
  isOnboardingAssistantOpen: boolean;
  setIsOnboardingAssistantOpen: (isOpen: boolean) => void;
  openOnboardingAssistant: () => void;
  closeOnboardingAssistant: () => void;
}

export const useOnboardingAssistantModalStore = create<OnboardingAssistantModalStore>((set) => ({
  isOnboardingAssistantOpen: false,
  setIsOnboardingAssistantOpen: (isOpen: boolean) => set({ isOnboardingAssistantOpen: isOpen }),
  openOnboardingAssistant: () => set({ isOnboardingAssistantOpen: true }),
  closeOnboardingAssistant: () => set({ isOnboardingAssistantOpen: false }),
}));
