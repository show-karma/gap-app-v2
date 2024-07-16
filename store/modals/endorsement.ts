import { create } from "zustand";

interface EndorsementStore {
  isEndorsementOpen: boolean;
  setIsEndorsementOpen: (isEndorsementOpen: boolean) => void;
}

export const useEndorsementStore = create<EndorsementStore>((set, get) => ({
  isEndorsementOpen: false,
  setIsEndorsementOpen: (isEndorsementOpen: boolean) =>
    set({ isEndorsementOpen }),
}));
