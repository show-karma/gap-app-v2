import { create } from "zustand";

interface OwnerStore {
  isOwner: boolean;
  setIsOwner: (isOwner: boolean) => void;
}

export const useOwnerStore = create<OwnerStore>((set, get) => ({
  isOwner: false,
  setIsOwner: (isOwner: boolean) => set({ isOwner }),
}));
