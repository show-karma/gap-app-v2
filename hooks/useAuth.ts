"use client";
import { errorManager } from "@/components/Utilities/errorManager";
import { useAuthStore } from "@/store/auth";
import { useOnboarding } from "@/store/modals/onboarding";
import { ISession } from "@/types/auth";
import { checkExpirationStatus } from "@/utilities/checkExpirationStatus";
import fetchData from "@/utilities/fetchData";
import { PAGES } from "@/utilities/pages";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { jwtDecode } from "jwt-decode";
import { usePathname, useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import toast from "react-hot-toast";
import Cookies from "universal-cookie";
import { Hex } from "viem";
import { useAccount, useChainId, useDisconnect, useSignMessage } from "wagmi";
import { useMixpanel } from "./useMixpanel";

import {
  authCookiePath,
  authWalletTypeCookiePath,
} from "@/utilities/auth-keys";

// Types
interface AuthResponse {
  token: string;
  walletType: "eoa" | "safe";
}

interface UseAuthReturn {
  authenticate: (
    newAddress?: Hex | undefined,
    shouldToast?: boolean
  ) => Promise<boolean | void>;
  disconnect: () => Promise<void>;
  softDisconnect: (newAddress: Hex) => void;
  signMessage: (messageToSign: string) => Promise<string | null>;
}

// Utility functions
const getNonce = async (publicAddress: string): Promise<string | null> => {
  try {
    const [data] = await fetchData(`/auth/login`, "POST", {
      publicAddress,
    });
    return data.nonceMessage;
  } catch (error: any) {
    errorManager(`Error in login of user ${publicAddress}`, error);
    return null;
  }
};

const getAccountToken = async (
  publicAddress: string,
  signedMessage: string,
  chainId?: number
): Promise<AuthResponse | undefined> => {
  try {
    const [response] = chainId
      ? await fetchData("/auth/authentication", "POST", {
          publicAddress,
          signedMessage,
          chainId,
        })
      : await fetchData("/auth/authentication", "POST", {
          publicAddress,
          signedMessage,
        });

    if (!response) {
      throw new Error("No response from authentication");
    }

    const { token, walletType } = response;
    return { token, walletType };
  } catch (error: any) {
    errorManager(`Error in get account token of user ${publicAddress}`, error);
    return undefined;
  }
};

const isTokenValid = (tokenValue: string | null): boolean => {
  if (!tokenValue) return false;
  const decoded = jwtDecode(tokenValue) as ISession;
  return checkExpirationStatus(decoded) !== "expired";
};

export const useAuth = (): UseAuthReturn => {
  const { isConnected, address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const chainId = useChainId();
  const { setIsAuthenticating, setIsAuth, isAuthenticating, setWalletType } =
    useAuthStore();
  const { disconnectAsync } = useDisconnect();
  const { setIsOnboarding } = useOnboarding?.();
  const router = useRouter();
  const cookies = new Cookies();
  const { mixpanel } = useMixpanel();
  const { signMessageAsync } = useSignMessage();
  const [inviteCode] = useQueryState("invite-code");
  const pathname = usePathname();

  const signMessage = async (messageToSign: string): Promise<string | null> => {
    try {
      return await signMessageAsync({ message: messageToSign });
    } catch (err) {
      await disconnectAsync?.();
      errorManager(`Error in signing message of user ${address}`, err);
      return null;
    }
  };

  const saveToken = (
    token: string | undefined,
    walletType: "eoa" | "safe" = "eoa"
  ): void => {
    if (!token) return;

    cookies.set(authCookiePath, token, { path: "/" });
    cookies.set(authWalletTypeCookiePath, walletType, { path: "/" });
    setWalletType(walletType);
    setIsAuth(true);
  };

  const authenticate = async (
    newAddress = address,
    shouldToast = true
  ): Promise<boolean | void> => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);

    try {
      if (!isConnected || !newAddress) {
        openConnectModal?.();
        return false;
      }

      // Check existing token
      if (typeof window !== "undefined") {
        const savedToken = cookies.get(authCookiePath);
        const savedWalletType = cookies.get(authWalletTypeCookiePath);
        if (savedToken && savedWalletType && isTokenValid(savedToken)) {
          saveToken(savedToken, savedWalletType);
          return true;
        }
      }

      if (!shouldToast) {
        toast.success("Wallet connected");
        toast.loading("Authenticating...");
      }

      const nonceMessage = await getNonce(newAddress);
      if (!nonceMessage) return false;

      const signedMessage = await signMessage(nonceMessage);
      if (!signedMessage) return false;

      const authResponse = await getAccountToken(
        newAddress,
        signedMessage,
        chainId
      );
      if (!authResponse?.token) {
        toast.error("Login failed");
        return false;
      }

      saveToken(authResponse.token, authResponse.walletType);

      if (authResponse.walletType === "safe") {
        toast.success("Logged in with safe wallet");
      }

      if (pathname === "/") {
        router.push(PAGES.MY_PROJECTS);
      }

      if (!pathname.includes("funding-map") && !inviteCode) {
        setIsOnboarding?.(true);
      }

      if (address) {
        mixpanel.reportEvent({
          event: "onboarding:popup",
          properties: { address },
        });
        mixpanel.reportEvent({
          event: "onboarding:navigation",
          properties: { address, id: "welcome" },
        });
      }

      return true;
    } catch (error: any) {
      errorManager(`Error in authenticate user ${newAddress}`, error);
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const disconnect = async (): Promise<void> => {
    cookies.remove(authCookiePath, { path: "/" });
    localStorage?.clear();
    setIsAuth(false);
    setWalletType(undefined);
    await disconnectAsync?.();
  };

  const softDisconnect = (newAddress: Hex): void => {
    cookies.remove(authCookiePath, { path: "/" });
    setIsAuth(false);
    setWalletType(undefined);
    authenticate(newAddress);
  };

  return { authenticate, disconnect, softDisconnect, signMessage };
};
