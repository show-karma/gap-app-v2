import {
  authCookiePath,
  authWalletTypeCookiePath,
} from "@/utilities/auth-keys";

// Constants for cookie keys and BroadcastChannel
export const AUTH_IN_PROGRESS_COOKIE = "gap_auth_in_progress";
export const AUTH_CHANNEL_NAME = "gap_auth_channel";

// Modified to include address-specific path
export const getAddressSpecificAuthCookie = (address: string) =>
  `${authCookiePath}_${address.toLowerCase()}`;
export const getAddressSpecificWalletTypeCookie = (address: string) =>
  `${authWalletTypeCookiePath}_${address.toLowerCase()}`;
