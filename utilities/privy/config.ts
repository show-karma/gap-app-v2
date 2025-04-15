import { PrivyClientConfig } from "@privy-io/react-auth";
import { config } from "../wagmi/config";
import { envVars } from "../enviromentVars";

// Configuration for Privy
export const privyConfig: PrivyClientConfig = {
  appearance: {
    theme: "light" as const,
    accentColor: "#4C6FFF" as `#${string}`,
    showWalletLoginFirst: true,
    walletList: [
      "metamask",
      "rainbow",
      "wallet_connect",
      "coinbase_wallet",
      "detected_wallets",
    ],
    walletChainType: "ethereum-only",
    logo: "https://gap.karmahq.xyz/logo/karma-gap-logo2.png",
  },
  embeddedWallets: {
    createOnLogin: "users-without-wallets",
    // requireUserPasswordOnCreate: true,
    showWalletUIs: false,
  },
  externalWallets: {
    walletConnect: {
      enabled: true,
    },
  },
  loginMethods: ["wallet", "email", "google"],
  supportedChains: config.chains,
  walletConnectCloudProjectId: envVars.PROJECT_ID,
  defaultChain: config.chains[0],
};
