"use client";
import { WagmiProvider as Wagmi } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import {
  DynamicContextProvider,
  DynamicWidget,
} from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";
import { config } from "@/utilities/wagmi/config";
import {
  ZeroDevSmartWalletConnectors,
  isZeroDevConnector,
} from "@dynamic-labs/ethereum-aa";

export const queryClient = new QueryClient();

const CustomWagmiProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <DynamicContextProvider
      settings={{
        environmentId: "f1d1b7df-5091-467d-8b32-8f88f2f699cd",
        walletConnectors: [
          EthereumWalletConnectors,
          ZeroDevSmartWalletConnectors,
        ],
      }}
    >
      <Wagmi config={config}>
        <QueryClientProvider client={queryClient}>
          <DynamicWagmiConnector>
            <DynamicWidget />
            {children}
          </DynamicWagmiConnector>
        </QueryClientProvider>
      </Wagmi>
    </DynamicContextProvider>
  );
};
export default CustomWagmiProvider;
