import { create } from "zustand"

interface MobileStore {
  isMobileMenuOpen: boolean
  setIsMobileMenuOpen: (isMobileMenuOpen: boolean) => void
}

export const useMobileStore = create<MobileStore>((set, _get) => ({
  isMobileMenuOpen: false,
  setIsMobileMenuOpen: (isMobileMenuOpen: boolean) => set({ isMobileMenuOpen }),
}))
