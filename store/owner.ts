import { create } from "zustand"

interface OwnerStore {
  isOwner: boolean
  setIsOwner: (isOwner: boolean) => void
  isOwnerLoading: boolean
  setIsOwnerLoading: (loading: boolean) => void
}

export const useOwnerStore = create<OwnerStore>((set, _get) => ({
  isOwner: false,
  setIsOwner: (isOwner: boolean) => set({ isOwner }),
  isOwnerLoading: true,
  setIsOwnerLoading: (isOwnerLoading: boolean) => set({ isOwnerLoading }),
}))
