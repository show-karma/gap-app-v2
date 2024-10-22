import { authCookiePath } from "@/utilities/auth-keys";
import Cookies from "universal-cookie";
import { create } from "zustand";

interface AuthStore {
  isAuth: boolean;
  setIsAuth: (isAuth: boolean) => void;
  isAuthenticating: boolean;
  setIsAuthenticating: (loading: boolean) => void;
  walletType: "eoa" | "safe" | undefined;
  setWalletType: (walletType: "eoa" | "safe" | undefined) => void;
  getToken: () => string | undefined;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  isAuth: false,
  setIsAuth: (isAuth: boolean) => set({ isAuth }),
  getToken: () => {
    const cookies = new Cookies();
    return cookies.get(authCookiePath);
  },
  isAuthenticating: false,
  setIsAuthenticating: (isAuthenticating: boolean) => set({ isAuthenticating }),
  walletType: "eoa",
  setWalletType: (walletType: "eoa" | "safe" | undefined) =>
    set({ walletType }),
}));
