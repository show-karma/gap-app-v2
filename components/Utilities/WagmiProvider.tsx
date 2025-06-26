"use client";
import { cookieToInitialState, WagmiProvider as Wagmi } from "wagmi";
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

const CustomWagmiProvider = ({
  children,
  cookie,
}: {
  children: React.ReactNode;
  cookie: string;
}) => {
  const initialState = cookieToInitialState(config, cookie);
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
      <Wagmi config={config} initialState={initialState}>
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
