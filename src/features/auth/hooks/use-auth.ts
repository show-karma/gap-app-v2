"use client";
import { errorManager } from "@/lib/utils/error-manager";
import { useAuthStore } from "../lib/store";
import { useOnboarding } from "@/features/modals/lib/stores/onboarding";
import { IExpirationStatus, ISession } from "../types";
import { checkExpirationStatus } from "@/utilities/checkExpirationStatus";
import { fetchData } from "@/lib/utils/fetch-data";
import { PAGES } from "@/utilities/pages";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { jwtDecode } from "jwt-decode";
import { usePathname, useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import toast from "react-hot-toast";
import Cookies from "universal-cookie";
import { Hex } from "viem";
import { useAccount, useChainId, useDisconnect, useSignMessage } from "wagmi";
import { useMixpanel } from "@/hooks/useMixpanel";
import { config } from "@/services/blockchain/providers/wagmi-config";
import { watchAccount } from "@wagmi/core";
import { useEffect, useRef } from "react";

import {
  authCookiePath,
  authWalletTypeCookiePath,
} from "@/utilities/auth-keys";
import {
  AUTH_CHANNEL_NAME,
  AUTH_IN_PROGRESS_COOKIE,
  getAddressSpecificAuthCookie,
  getAddressSpecificWalletTypeCookie,
} from "@/lib/utils/cookies";

const getNonce = async (publicAddress: string) => {
  try {
    const [data] = await fetchData(`/auth/login`, "POST", {
      publicAddress,
    });
    const { nonceMessage } = data;
    return nonceMessage;
  } catch (error: any) {
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

// Helper to check if another tab is authenticating
const isAuthenticatingInAnotherTab = (
  address: string,
  cookies: Cookies
): boolean => {
  try {
    const inProgressAuth = cookies.get(AUTH_IN_PROGRESS_COOKIE);
    if (!inProgressAuth) return false;

    // Check if the auth is for the same address and still valid (not expired)
    if (inProgressAuth.address.toLowerCase() === address.toLowerCase()) {
      // Check if the timestamp is recent (within last 30 seconds)
      const isRecent = Date.now() - inProgressAuth.timestamp < 30000;
      if (isRecent) return true;

      // If not recent, clean up the stale entry
      cookies.remove(AUTH_IN_PROGRESS_COOKIE, { path: "/" });
    }
    return false;
  } catch (e) {
    console.error("Error checking auth in progress:", e);
    return false;
  }
};

// Set authentication in progress flag
const setAuthInProgress = (address: string, cookies: Cookies): void => {
  try {
    cookies.set(
      AUTH_IN_PROGRESS_COOKIE,
      {
        address,
        timestamp: Date.now(),
        tabId: Math.random().toString(36).substring(2, 9), // Generate a random tab ID
      },
      { path: "/" }
    );
  } catch (e) {
    console.error("Error setting auth in progress:", e);
  }
};

// Clear authentication in progress flag
const clearAuthInProgress = (cookies: Cookies): void => {
  try {
    cookies.remove(AUTH_IN_PROGRESS_COOKIE, { path: "/" });
  } catch (e) {
    console.error("Error clearing auth in progress:", e);
  }
};

export const useAuth = () => {
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

  // Use a ref to track authentication requests in progress for specific addresses
  const pendingAuthRequests = useRef<Set<string>>(new Set());
  // Reference to the BroadcastChannel for cross-tab communication
  const authChannelRef = useRef<BroadcastChannel | null>(null);

  const pathname = usePathname();

  // Setup cookie change detection for cross-tab communication
  useEffect(() => {
    // Check for auth in progress cookie every second to detect changes from other tabs
    const intervalId = setInterval(() => {
      if (!address) return;

      const inProgressAuth = cookies.get(AUTH_IN_PROGRESS_COOKIE);

      // If there's an auth in progress for this address, add it to pending requests
      if (
        inProgressAuth &&
        inProgressAuth.address &&
        inProgressAuth.address.toLowerCase() === address.toLowerCase()
      ) {
        pendingAuthRequests.current.add(address.toLowerCase());
      }

      // Check if a token has appeared for a pending auth
      Array.from(pendingAuthRequests.current).forEach((pendingAddress) => {
        const addressSpecificCookie =
          getAddressSpecificAuthCookie(pendingAddress);
        const savedToken = cookies.get(addressSpecificCookie);

        if (savedToken && isTokenValid(savedToken)) {
          // Token found! If it's the current address, use it
          if (
            address &&
            address.toLowerCase() === pendingAddress.toLowerCase()
          ) {
            const walletTypeCookie =
              getAddressSpecificWalletTypeCookie(pendingAddress);
            const savedWalletType = cookies.get(walletTypeCookie);

            // Update our auth state with the token that appeared
            cookies.set(authCookiePath, savedToken, { path: "/" });
            cookies.set(authWalletTypeCookiePath, savedWalletType, {
              path: "/",
            });
            setWalletType(savedWalletType);
            setIsAuth(true);
          }

          // Remove from pending since auth is complete
          pendingAuthRequests.current.delete(pendingAddress);
        }
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [address]);

  // Initialize BroadcastChannel for cross-tab communication
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      // Check if BroadcastChannel is supported
      if ("BroadcastChannel" in window) {
        authChannelRef.current = new BroadcastChannel(AUTH_CHANNEL_NAME);

        // Listen for auth events from other tabs
        authChannelRef.current.onmessage = (event) => {
          const { type, address, success } = event.data;

          if (type === "auth_started" && address) {
            // Another tab started authentication - add to pending
            pendingAuthRequests.current.add(address.toLowerCase());
          } else if (type === "auth_completed" && address) {
            // Authentication completed in another tab
            pendingAuthRequests.current.delete(address.toLowerCase());

            // If successful, refresh our state
            if (success) {
              // Check for a token for this address
              const addressSpecificCookie =
                getAddressSpecificAuthCookie(address);
              const savedToken = cookies.get(addressSpecificCookie);

              if (savedToken && isTokenValid(savedToken)) {
                const walletTypeCookie =
                  getAddressSpecificWalletTypeCookie(address);
                const savedWalletType = cookies.get(walletTypeCookie);

                // Update our auth state with the token from the other tab
                cookies.set(authCookiePath, savedToken, { path: "/" });
                cookies.set(authWalletTypeCookiePath, savedWalletType, {
                  path: "/",
                });
                setWalletType(savedWalletType);
                setIsAuth(true);
              }
            }
          }
        };
      }
    } catch (e) {
      console.error("Error setting up BroadcastChannel:", e);
    }

    // Clean up
    return () => {
      if (authChannelRef.current) {
        authChannelRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    const unwatch = watchAccount(config, {
      onChange: (account, prevAccount) => {
        if (!account) {
          errorManager("User changed to empty account instance", account, {
            account,
            prevAccount,
          });
          return;
        }

        if (account.address && account.address !== prevAccount.address) {
          // Address changed - try to authenticate with the new address
          // Check if we already have a token for this address
          const addressSpecificCookie = getAddressSpecificAuthCookie(
            account.address
          );
          const savedToken = cookies.get(addressSpecificCookie);

          if (savedToken) {
            // We have a token for this address, check if it's valid
            const isValid = isTokenValid(savedToken);
            if (isValid) {
              // Token is valid, set up auth state with it
              const walletTypeCookie = getAddressSpecificWalletTypeCookie(
                account.address
              );
              const savedWalletType = cookies.get(walletTypeCookie);

              // Update the current address token in the regular auth cookie
              cookies.set(authCookiePath, savedToken, { path: "/" });
              cookies.set(authWalletTypeCookiePath, savedWalletType, {
                path: "/",
              });

              setWalletType(savedWalletType);
              setIsAuth(true);
              return;
            }
          }

          // No valid token found for this address, need to authenticate
          setIsAuth(false);
          setWalletType(undefined);
          authenticate(account.address);
        }
      },
    });
    return () => unwatch();
  }, []);

  const signMessage = async (messageToSign: string) => {
    try {
      const signedMessage = await signMessageAsync({ message: messageToSign });
      return signedMessage;
    } catch (err) {
      // eslint-disable-next-line no-console
      await disconnectAsync?.();
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
      if (!response) {
        throw new Error("No response from authentication");
      }
      const { token, walletType } = response;
      return { token, walletType };
    } catch (error: any) {
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
    walletType: "eoa" | "safe" = "eoa",
    userAddress = address
  ) => {
    if (token && userAddress) {
      // Save to address-specific cookie
      const addressSpecificCookie = getAddressSpecificAuthCookie(userAddress);
      const addressSpecificWalletType =
        getAddressSpecificWalletTypeCookie(userAddress);

      cookies.set(addressSpecificCookie, token, { path: "/" });
      cookies.set(addressSpecificWalletType, walletType, { path: "/" });

      // Also save to regular auth cookie (current active address)
      cookies.set(authCookiePath, token, { path: "/" });
      cookies.set(authWalletTypeCookiePath, walletType, { path: "/" });
    }

    setWalletType(walletType);
    setIsAuth(true);
  };

  const authenticate = async (newAddress = address, shouldToast = true) => {
    try {
      // Prevent duplicate authentication requests for the same address
      if (!newAddress) {
        return false;
      }

      const addressStr = newAddress.toString().toLowerCase();

      // Check if authentication is already in progress in this tab
      if (pendingAuthRequests.current.has(addressStr) || isAuthenticating) {
        console.log(
          "Authentication already in progress for",
          addressStr,
          "in this tab"
        );
        return false;
      }

      // Check if authentication is in progress in another tab
      if (isAuthenticatingInAnotherTab(addressStr, cookies)) {
        // Wait for a token to become available
        toast.loading("Authenticating...");

        // Add to pending requests to prevent additional attempts
        pendingAuthRequests.current.add(addressStr);
        setIsAuthenticating(true);

        // Wait up to 30 seconds for the other tab to complete authentication
        for (let i = 0; i < 30; i++) {
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Check if a token has appeared
          const addressSpecificCookie =
            getAddressSpecificAuthCookie(newAddress);
          const savedToken = cookies.get(addressSpecificCookie);

          if (savedToken && isTokenValid(savedToken)) {
            // Token found! Use it to authenticate
            const walletTypeCookie =
              getAddressSpecificWalletTypeCookie(newAddress);
            const savedWalletType = cookies.get(walletTypeCookie);

            toast.dismiss();
            toast.success("Authentication completed");
            saveToken(savedToken, savedWalletType, newAddress);

            // Clean up
            pendingAuthRequests.current.delete(addressStr);
            setIsAuthenticating(false);
            return true;
          }
        }

        // If we get here, the other tab's authentication timed out or failed
        toast.dismiss();
        toast.error("Authentication timed out");
        pendingAuthRequests.current.delete(addressStr);
        setIsAuthenticating(false);
        return false;
      }

      // Mark this address as having an auth request in progress
      pendingAuthRequests.current.add(addressStr);
      setIsAuthenticating(true);

      // Set authentication in progress flag for cross-tab awareness
      setAuthInProgress(addressStr, cookies);

      // Notify other tabs that we're starting authentication
      if (authChannelRef.current) {
        authChannelRef.current.postMessage({
          type: "auth_started",
          address: addressStr,
        });
      }

      if (!isConnected) {
        openConnectModal?.();

        // Clean up if the connect modal is closed without connecting
        clearAuthInProgress(cookies);
        if (authChannelRef.current) {
          authChannelRef.current.postMessage({
            type: "auth_completed",
            address: addressStr,
            success: false,
          });
        }
        return false;
      }

      // Check for address-specific token first
      if (typeof window !== "undefined") {
        const addressSpecificCookie = getAddressSpecificAuthCookie(newAddress);
        const addressSpecificWalletType =
          getAddressSpecificWalletTypeCookie(newAddress);

        const savedToken = cookies.get(addressSpecificCookie);
        const savedWalletType = cookies.get(addressSpecificWalletType);

        if (savedToken && savedWalletType) {
          const isValid = isTokenValid(savedToken);
          if (isValid) {
            saveToken(savedToken, savedWalletType, newAddress);

            // Clear in-progress flag and notify other tabs
            clearAuthInProgress(cookies);
            if (authChannelRef.current) {
              authChannelRef.current.postMessage({
                type: "auth_completed",
                address: addressStr,
                success: true,
              });
            }
            return true;
          }
        }
      }

      if (!shouldToast) {
        toast.success("Wallet connected");
        toast.loading("Authenticating...");
      }
      const nonceMessage = await getNonce(newAddress);

      const signedMessage = await signMessage(nonceMessage);
      if (!signedMessage) {
        // Clean up if signature fails
        clearAuthInProgress(cookies);
        if (authChannelRef.current) {
          authChannelRef.current.postMessage({
            type: "auth_completed",
            address: addressStr,
            success: false,
          });
        }
        return false;
      }

      const { token, walletType } = await getAccountToken(
        newAddress,
        signedMessage
      );

      let success = false;
      if (token) {
        saveToken(token, walletType, newAddress);
        success = true;
        if (walletType === "safe") {
          toast.success("Logged in with safe wallet");
        }
      } else {
        toast.error("Login failed");
      }

      // Clear in-progress flag and notify other tabs
      clearAuthInProgress(cookies);
      if (authChannelRef.current) {
        authChannelRef.current.postMessage({
          type: "auth_completed",
          address: addressStr,
          success,
        });
      }

      if (!success) return false;

      if (pathname === "/") {
        router.push(PAGES.MY_PROJECTS);
      }
      if (!pathname.includes("funding-map")) {
        if (inviteCode) return true;
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

      // Clean up on error
      if (newAddress) {
        const addressStr = newAddress.toString().toLowerCase();
        clearAuthInProgress(cookies);
        if (authChannelRef.current) {
          authChannelRef.current.postMessage({
            type: "auth_completed",
            address: addressStr,
            success: false,
          });
        }
      }
      return false;
    } finally {
      // Remove the address from pending auth requests
      if (newAddress) {
        pendingAuthRequests.current.delete(newAddress.toString().toLowerCase());
      }
      setIsAuthenticating(false);
    }
  };

  const disconnect = async () => {
    console.log("User disconnected", {
      address,
      isConnected,
    });

    // Remove both the address-specific cookies and the general ones
    if (address) {
      const addressSpecificCookie = getAddressSpecificAuthCookie(address);
      const addressSpecificWalletType =
        getAddressSpecificWalletTypeCookie(address);

      cookies.remove(addressSpecificCookie, { path: "/" });
      cookies.remove(addressSpecificWalletType, { path: "/" });
    }

    cookies.remove(authCookiePath, { path: "/" });
    cookies.remove(authWalletTypeCookiePath, { path: "/" });

    setIsAuth(false);
    setWalletType(undefined);

    // Clear all pending auth requests
    pendingAuthRequests.current.clear();

    // Clear any in-progress authentication
    clearAuthInProgress(cookies);

    await disconnectAsync?.();
  };

  // No need for softDisconnect anymore as we handle account switching differently
  const softDisconnect = (newAddress: Hex) => {
    console.log("Account changed", {
      newAddress,
      address,
    });
    // We don't need to disconnect now, just make sure we have a valid token
    authenticate(newAddress);
  };

  return { authenticate, disconnect, softDisconnect, signMessage };
};
