import { create } from "zustand"

interface TransferOwnershipStore {
  isTransferOwnershipModalOpen: boolean
  setIsTransferOwnershipModalOpen: (isTransferOwnershipModalOpen: boolean) => void
  openTransferOwnershipModal: () => void
  closeTransferOwnershipModal: () => void
}

export const useTransferOwnershipModalStore = create<TransferOwnershipStore>((set) => ({
  isTransferOwnershipModalOpen: false,
  setIsTransferOwnershipModalOpen: (isTransferOwnershipModalOpen: boolean) =>
    set({ isTransferOwnershipModalOpen }),
  openTransferOwnershipModal: () => set({ isTransferOwnershipModalOpen: true }),
  closeTransferOwnershipModal: () => set({ isTransferOwnershipModalOpen: false }),
}))
