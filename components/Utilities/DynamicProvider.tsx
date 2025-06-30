"use client";
import { cookieToInitialState, WagmiProvider } from "wagmi";
import { dynamicConfig } from "@/utilities/wagmi/dynamic-config";
import { QueryClientProvider } from "@tanstack/react-query";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { ZeroDevSmartWalletConnectors } from "@dynamic-labs/ethereum-aa";
import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";
import { envVars } from "@/utilities/enviromentVars";
import { queryClient } from "@/utilities/queries/client";
import { dynamicSettings } from "@/utilities/dynamic/settings";

const DynamicProvider = ({
  children,
  cookie,
}: {
  cookie: string;
  children: React.ReactNode;
}) => {
  const initialState = cookieToInitialState(dynamicConfig, cookie);

  if (!envVars.DYNAMIC_ENVIRONMENT_ID) {
    throw new Error(
      "Missing Dynamic Environment ID. Please set NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID in your environment variables."
    );
  }

  return (
    <DynamicContextProvider
      settings={{
        environmentId: envVars.DYNAMIC_ENVIRONMENT_ID,
        walletConnectors: [
          EthereumWalletConnectors,
          ZeroDevSmartWalletConnectors,
        ],
        ...dynamicSettings,
      }}
    >
      <WagmiProvider config={dynamicConfig} initialState={initialState}>
        <QueryClientProvider client={queryClient}>
          <DynamicWagmiConnector>{children}</DynamicWagmiConnector>
        </QueryClientProvider>
      </WagmiProvider>
    </DynamicContextProvider>
  );
};

export default DynamicProvider;
