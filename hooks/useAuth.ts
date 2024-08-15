"use client";
import { useAuthStore } from "@/store/auth";
import { jwtDecode } from "jwt-decode";
import fetchData from "@/utilities/fetchData";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import Cookies from "universal-cookie";
import { useAccount, useDisconnect, useSignMessage, useChainId } from "wagmi";
import toast from "react-hot-toast";
import { IExpirationStatus, ISession } from "@/types/auth";
import { checkExpirationStatus } from "@/utilities/checkExpirationStatus";
import { Hex } from "viem";
import { useOnboarding } from "@/store/modals/onboarding";
import { PAGES } from "@/utilities/pages";
import { usePathname, useRouter } from "next/navigation";
import { useMixpanel } from "./useMixpanel";
import { errorManager } from "@/components/Utilities/ErrorManager";

export const authCookiePath = "gap_auth";
export const authWalletTypeCookiePath = "gap_auth_wallet_type";

const getNonce = async (publicAddress: string) => {
  try {
    const [data] = await fetchData(`/auth/login`, "POST", {
      publicAddress,
    });
    const { nonceMessage } = data;
    return nonceMessage;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in login:", error);
    errorManager(`Error in login of user ${publicAddress}`, error);
    return null;
  }
};

const isTokenValid = (tokenValue: string | null) => {
  if (!tokenValue) return false;
  const decoded = jwtDecode(tokenValue) as ISession;
  const expiredStatus: IExpirationStatus = checkExpirationStatus(decoded);
  if (expiredStatus === "expired") {
    return false;
  }
  return true;
};

export const useAuth = () => {
  const { isConnected, address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const chainId = useChainId();
  const { setIsAuthenticating, setIsAuth, isAuthenticating, setWalletType } =
    useAuthStore();
  // const { signMessageAsync } = useSignMessage();
  const { disconnectAsync } = useDisconnect();
  const { setIsOnboarding } = useOnboarding?.();
  const router = useRouter();
  const cookies = new Cookies();
  const { mixpanel } = useMixpanel();
  const { signMessageAsync } = useSignMessage();

  const pathname = usePathname();

  const signMessage = async (messageToSign: string) => {
    try {
      const signedMessage = await signMessageAsync({ message: messageToSign });
      return signedMessage;
    } catch (err) {
      // eslint-disable-next-line no-console
      await disconnectAsync();
      errorManager(`Error in signing message of user ${address}`, err);
      console.log(err);
      return null;
    }
  };

  const getAccountToken = async (
    publicAddress: string,
    signedMessage: string
  ) => {
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
      const { token, walletType } = response;
      return { token, walletType };
    } catch (error) {
      // eslint-disable-next-line no-console
      errorManager(
        `Error in get account token of user ${publicAddress}`,
        error
      );
      console.log("Error in get account token", error);
      return { token: undefined, walletType: undefined };
    }
  };

  const saveToken = (
    token: string | undefined,
    walletType: "eoa" | "safe" = "eoa"
  ) => {
    if (token) {
      cookies.set(authCookiePath, token, {
        path: "/",
      });
      cookies.set(authWalletTypeCookiePath, walletType, {
        path: "/",
      });
    }

    setWalletType(walletType);
    setIsAuth(true);
  };

  const authenticate = async (newAddress = address, shouldToast = true) => {
    try {
      if (isAuthenticating) return;
      setIsAuthenticating(true);
      if (!isConnected || !newAddress) {
        openConnectModal?.();
        return false;
      }
      if (typeof window !== "undefined") {
        const savedToken = cookies.get(authCookiePath);
        const savedWalletType = cookies.get(authWalletTypeCookiePath);
        if (savedToken && savedWalletType) {
          const isValid = isTokenValid(savedToken);
          if (isValid) {
            saveToken(savedToken, savedWalletType);
            return;
          }
        }
      }
      if (!shouldToast) {
        toast.success("Wallet connected");
        toast.loading("Authenticating...");
      }
      const nonceMessage = await getNonce(newAddress);

      const signedMessage = await signMessage(nonceMessage);
      if (!signedMessage) return;
      const { token, walletType } = await getAccountToken(
        newAddress,
        signedMessage
      );

      if (token) {
        saveToken(token, walletType);
        if (walletType === "safe") {
          toast.success("Logged in with safe wallet");
        }
        // toast.dismiss();
      } else {
        toast.error("Login failed");
        return;
      }
      if (pathname === "/") {
        router.push(PAGES.MY_PROJECTS);
      }
      if (!pathname.includes("funding-map")) {
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
      // eslint-disable-next-line no-console
      console.log(error);
      return;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const disconnect = async () => {
    cookies.remove(authCookiePath, {
      path: "/",
    });
    localStorage?.clear();

    setIsAuth(false);
    setWalletType(undefined);
    disconnectAsync();
  };

  const softDisconnect = (newAddress: Hex) => {
    cookies.remove(authCookiePath, {
      path: "/",
    });
    setIsAuth(false);
    setWalletType(undefined);
    authenticate(newAddress);
  };

  return { authenticate, disconnect, softDisconnect };
};
