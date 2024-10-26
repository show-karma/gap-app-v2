"use client";
import { config } from "@/utilities/wagmi/config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider } from '@privy-io/wagmi';
import { privyConfig } from "@/utilities/privy/privyConfig";
import { envVars } from "@/utilities/enviromentVars";

export const queryClient = new QueryClient();

const Web3Provider = ({ children }: { children: React.ReactNode }) => {
  return (
    <PrivyProvider appId={envVars.PRIVY_APP_ID} config={privyConfig}>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={config}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
};
export default Web3Provider;
