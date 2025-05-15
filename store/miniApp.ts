import { create } from "zustand";

interface MiniAppStore {
  isMiniApp: boolean;
  setIsMiniApp: (isMiniApp: boolean) => void;
}

export const useMiniAppStore = create<MiniAppStore>((set, get) => ({
  isMiniApp: false,
  setIsMiniApp: (isMiniApp: boolean) => set({ isMiniApp }),
}));
