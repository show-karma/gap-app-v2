"use client";
import { cookieToInitialState, WagmiProvider } from "wagmi";
import { dynamicConfig } from "@/utilities/wagmi/dynamic-config";
import { QueryClientProvider } from "@tanstack/react-query";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { ZeroDevSmartWalletConnectors } from "@dynamic-labs/ethereum-aa";
import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";
import { envVars } from "@/utilities/enviromentVars";
import { getQueryClient } from "@/utilities/queries/client";
import { dynamicSettings } from "@/utilities/dynamic/settings";
import { useMixpanel } from "@/hooks/useMixpanel";
import { usePathname, useRouter } from "next/navigation";
import { PAGES } from "@/utilities/pages";
import { useOnboarding } from "@/store/modals/onboarding";
import { useQueryState } from "nuqs";

const DynamicProvider = ({
  children,
  cookie,
}: {
  cookie: string;
  children: React.ReactNode;
}) => {
  const initialState = cookieToInitialState(dynamicConfig, cookie);
  const router = useRouter();
  const { mixpanel } = useMixpanel();
  const pathname = usePathname();
  const { setIsOnboarding } = useOnboarding?.();
  const [inviteCode] = useQueryState("invite-code");

  if (!envVars.DYNAMIC_ENVIRONMENT_ID) {
    throw new Error(
      "Missing Dynamic Environment ID. Please set NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID in your environment variables."
    );
  }

  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <DynamicContextProvider
        settings={{
          environmentId: envVars.DYNAMIC_ENVIRONMENT_ID,
          walletConnectors: [
            EthereumWalletConnectors,
            ZeroDevSmartWalletConnectors,
          ],
          events: {
            onAuthSuccess: (user) => {
              const address = user?.primaryWallet?.address;
              if (pathname === "/") {
                router.push(PAGES.MY_PROJECTS);
              }
              if (!pathname.includes("funding-map")) {
                if (!inviteCode) {
                  setIsOnboarding?.(true);
                }
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
            },
          },
          ...dynamicSettings,
        }}
      >
        <WagmiProvider config={dynamicConfig} initialState={initialState}>
          <DynamicWagmiConnector>{children}</DynamicWagmiConnector>
        </WagmiProvider>
      </DynamicContextProvider>
    </QueryClientProvider>
  );
};

export default DynamicProvider;
