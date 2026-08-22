import { create } from "zustand";

interface GettingStartedStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

/**
 * The "Getting started" chooser, opened from the profile menu on every page.
 * State lives in a store rather than in the menu because the menu unmounts as
 * soon as an item is chosen, which would take the dialog with it.
 */
export const useGettingStarted = create<GettingStartedStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
