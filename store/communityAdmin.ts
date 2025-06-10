import { create } from "zustand";

interface CommunityAdminStore {
  isCommunityAdmin: boolean;
  setIsCommunityAdmin: (isOwner: boolean) => void;
  isCommunityAdminLoading: boolean;
  setIsCommunityAdminLoading: (loading: boolean) => void;
}

export const useCommunityAdminStore = create<CommunityAdminStore>(
  (set, get) => ({
    isCommunityAdmin: false,
    setIsCommunityAdmin: (isCommunityAdmin: boolean) =>
      set({ isCommunityAdmin }),
    isCommunityAdminLoading: true,
    setIsCommunityAdminLoading: (isCommunityAdminLoading: boolean) =>
      set({ isCommunityAdminLoading }),
  })
);
