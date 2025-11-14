import { create } from "zustand"

interface CommunityAdminStore {
  isCommunityAdmin: boolean
  setIsCommunityAdmin: (isOwner: boolean) => void
}

export const useCommunityAdminStore = create<CommunityAdminStore>((set, _get) => ({
  isCommunityAdmin: false,
  setIsCommunityAdmin: (isCommunityAdmin: boolean) => set({ isCommunityAdmin }),
}))
