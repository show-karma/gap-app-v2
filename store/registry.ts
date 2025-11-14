import { create } from "zustand"

interface RegistryStore {
  isPoolManager: boolean
  setIsPoolManager: (isPoolManager: boolean) => void
  isPoolManagerLoading: boolean
  setIsPoolManagerLoading: (loading: boolean) => void
  isRegistryAdmin: boolean
  setIsRegistryAdmin: (isRegistryAdmin: boolean) => void
  isRegistryAdminLoading: boolean
  setIsRegistryAdminLoading: (loading: boolean) => void
}

export const useRegistryStore = create<RegistryStore>((set, _get) => ({
  isPoolManager: false,
  setIsPoolManager: (isPoolManager: boolean) => set({ isPoolManager }),
  isPoolManagerLoading: true,
  setIsPoolManagerLoading: (isPoolManagerLoading: boolean) => set({ isPoolManagerLoading }),
  isRegistryAdmin: false,
  setIsRegistryAdmin: (isRegistryAdmin: boolean) => set({ isRegistryAdmin }),
  isRegistryAdminLoading: true,
  setIsRegistryAdminLoading: (isRegistryAdminLoading: boolean) => set({ isRegistryAdminLoading }),
}))
