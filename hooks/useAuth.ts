import { useAuthStore } from "@/store/auth";
import { jwtDecode } from "jwt-decode";
import fetchData from "@/utilities/fetchData";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import Cookies from "universal-cookie";
import { useAccount, useDisconnect, useSignMessage } from "wagmi";
import toast from "react-hot-toast";
import { signMessage as sign } from "wagmi/actions";
import { IExpirationStatus, ISession } from "@/types/auth";
import { checkExpirationStatus } from "@/utilities/checkExpirationStatus";
import { Hex } from "viem";

export const authCookiePath = "gap_auth";

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
  const { setIsAuthenticating, setIsAuth } = useAuthStore();
  // const { signMessageAsync } = useSignMessage();
  const { disconnectAsync } = useDisconnect();

  const cookies = new Cookies();

  const signMessage = async (messageToSign: string) => {
    try {
      const signedMessage = await sign({ message: messageToSign });
      return signedMessage;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(err);
      return null;
    }
  };

  const getAccountToken = async (
    publicAddress: string,
    signedMessage: string
  ) => {
    try {
      const [response] = await fetchData("/auth/authentication", "POST", {
        publicAddress,
        signedMessage,
      });
      const { token } = response;
      return token;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log("Error in getAccountAssets", error);
      return undefined;
    }
  };

  const saveToken = (token: string | undefined) => {
    if (token)
      cookies.set(authCookiePath, token, {
        path: "/",
      });
    setIsAuth(true);
  };

  const authenticate = async (newAddress = address) => {
    if (!isConnected || !newAddress) {
      setIsAuthenticating(true);
      openConnectModal?.();
      return false;
    }
    try {
      if (typeof window !== "undefined") {
        const savedToken = cookies.get(authCookiePath);
        if (savedToken) {
          const isValid = isTokenValid(savedToken);
          if (isValid) {
            saveToken(savedToken);
            return;
          }
        }
      }
      const nonceMessage = await getNonce(newAddress);

      const signedMessage = await signMessage(nonceMessage);
      if (!signedMessage) return;
      const token = await getAccountToken(newAddress, signedMessage);

      if (token) {
        saveToken(token);
      } else {
        toast.error("Login failed: Signature and address don't match");
        return;
      }

      return true;
    } catch (error) {
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
    disconnectAsync();
  };

  const softDisconnect = (newAddress: Hex) => {
    console.log("softDisconnect");
    cookies.remove(authCookiePath, {
      path: "/",
    });
    setIsAuth(false);
    authenticate(newAddress);
  };

  return { authenticate, disconnect, softDisconnect };
};