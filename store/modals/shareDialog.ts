import { create } from "zustand"

interface ShareDialogState {
  isOpen: boolean
  modalShareText?: string
  shareButtonText?: string
  modalShareSecondText?: string
  shareText: string
  openShareDialog: (params: {
    modalShareText?: string
    modalShareSecondText?: string
    shareButtonText?: string
    shareText: string
  }) => void
  closeShareDialog: () => void
}

export const useShareDialogStore = create<ShareDialogState>((set) => ({
  isOpen: false,
  modalShareText: undefined,
  shareButtonText: undefined,
  shareText: "",
  modalShareSecondText: undefined,
  openShareDialog: (params) =>
    set({
      isOpen: true,
      modalShareText: params.modalShareText,
      shareButtonText: params.shareButtonText,
      shareText: params.shareText,
      modalShareSecondText:
        params.modalShareSecondText ||
        `We're thrilled to celebrate this achievement with you.
                      Your dedication and hard work have paid off, and we
                      couldn't be prouder of your progress. Keep up the
                      fantastic work!`,
    }),
  closeShareDialog: () =>
    set({
      isOpen: false,
      modalShareText: undefined,
      shareButtonText: undefined,
      shareText: "",
      modalShareSecondText: undefined,
    }),
}))
