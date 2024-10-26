import { PrivyClientConfig } from "@privy-io/react-auth";
import { appNetwork } from "@/utilities/network";
import { envVars } from "@/utilities/enviromentVars";

export const privyConfig: PrivyClientConfig = {
  embeddedWallets: {
    createOnLogin: "users-without-wallets",
    requireUserPasswordOnCreate: true,
    noPromptOnSignature: false,
  },
  loginMethods: ["wallet", "email", "google"],
  appearance: {
    walletList: [
      "metamask",
      "rainbow",
      "wallet_connect",
      "coinbase_wallet",
      "detected_wallets",
    ],
    walletChainType: "ethereum-only",
    showWalletLoginFirst: true,
    theme: "light",
    accentColor: "#E40536",
    logo: "https://gap.karmahq.xyz/logo/karma-gap-logo2.png",
  },
  supportedChains: appNetwork,
  walletConnectCloudProjectId: envVars.PROJECT_ID,
};
