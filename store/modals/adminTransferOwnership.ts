import { create } from "zustand";

interface AdminTransferOwnershipStore {
  isAdminTransferOwnershipModalOpen: boolean;
  setIsAdminTransferOwnershipModalOpen: (isAdminTransferOwnershipModalOpen: boolean) => void;
  openAdminTransferOwnershipModal: () => void;
  closeAdminTransferOwnershipModal: () => void;
}

export const useAdminTransferOwnershipModalStore = create<AdminTransferOwnershipStore>((set) => ({
  isAdminTransferOwnershipModalOpen: false,
  setIsAdminTransferOwnershipModalOpen: (isAdminTransferOwnershipModalOpen: boolean) =>
    set({
      isAdminTransferOwnershipModalOpen,
    }),
  openAdminTransferOwnershipModal: () => set({ isAdminTransferOwnershipModalOpen: true }),
  closeAdminTransferOwnershipModal: () => set({ isAdminTransferOwnershipModalOpen: false }),
}));
