import { create } from "zustand";

interface OwnerStore {
  isOwner: boolean;
  setIsOwner: (isOwner: boolean) => void;
  isOwnerLoading: boolean;
  setIsOwnerLoading: (loading: boolean) => void;
}

export const useOwnerStore = create<OwnerStore>((set, _get) => ({
  isOwner: false,
  setIsOwner: (isOwner: boolean) => set({ isOwner }),
  // Default to true: prevents flash of "not authorized" before useContractOwner
  // completes its first check. The hook sets this to false once loading finishes.
  isOwnerLoading: true,
  setIsOwnerLoading: (isOwnerLoading: boolean) => set({ isOwnerLoading }),
}));
