import Cookies from "universal-cookie";
import { getWalletFromWagmiStore } from "./get-wallet-from-wagmi-store";
import {
  getAddressSpecificAuthCookie,
  getAddressSpecificWalletTypeCookie,
} from "@/lib/utils/cookies";

export function getCookiesFromStoredWallet(): {
  token: string | undefined;
  walletType: string | undefined;
} {
  const cookies = new Cookies();
  const address = getWalletFromWagmiStore();
  const addressSpecificCookie = getAddressSpecificAuthCookie(address);
  const addressSpecificWalletType = getAddressSpecificWalletTypeCookie(address);

  const token = cookies.get(addressSpecificCookie);
  const walletType = cookies.get(addressSpecificWalletType);

  return {
    token,
    walletType,
  };
}
