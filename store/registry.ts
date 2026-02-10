import { create } from "zustand";

interface RegistryStore {
  isProgramCreator: boolean;
  setIsProgramCreator: (isProgramCreator: boolean) => void;
  isProgramCreatorLoading: boolean;
  setIsProgramCreatorLoading: (loading: boolean) => void;
  isRegistryAdmin: boolean;
  setIsRegistryAdmin: (isRegistryAdmin: boolean) => void;
  isRegistryAdminLoading: boolean;
  setIsRegistryAdminLoading: (loading: boolean) => void;
}

export const useRegistryStore = create<RegistryStore>((set, _get) => ({
  isProgramCreator: false,
  setIsProgramCreator: (isProgramCreator: boolean) => set({ isProgramCreator }),
  isProgramCreatorLoading: true,
  setIsProgramCreatorLoading: (isProgramCreatorLoading: boolean) =>
    set({ isProgramCreatorLoading }),
  isRegistryAdmin: false,
  setIsRegistryAdmin: (isRegistryAdmin: boolean) => set({ isRegistryAdmin }),
  isRegistryAdminLoading: true,
  setIsRegistryAdminLoading: (isRegistryAdminLoading: boolean) => set({ isRegistryAdminLoading }),
}));
