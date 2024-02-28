import { authCookiePath } from "@/hooks/useAuth";
import Cookies from "universal-cookie";
import { create } from "zustand";

interface AuthStore {
  isAuth: boolean;
  setIsAuth: (isAuth: boolean) => void;
  isAuthenticating: boolean;
  setIsAuthenticating: (loading: boolean) => void;
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
}));
