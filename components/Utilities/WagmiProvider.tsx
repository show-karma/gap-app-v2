"use client";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider as PrivyWagmiProvider } from "@privy-io/wagmi";
import { config } from "@/utilities/wagmi/config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { privyConfig } from "@/utilities/privy/config";
// import { SmartWalletsProvider } from "@privy-io/react-auth/smart-wallets";
import { envVars } from "@/utilities/enviromentVars";

export const queryClient = new QueryClient();

const WagmiProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <PrivyProvider appId={envVars.PRIVY_APP_ID} config={privyConfig}>
      {/* <SmartWalletsProvider
        config={{
          paymasterContext: {
            policyId: envVars.ALCHEMY_POLICY_ID,
          },
        }}
      > */}
      <QueryClientProvider client={queryClient}>
        <PrivyWagmiProvider config={config}>{children}</PrivyWagmiProvider>
      </QueryClientProvider>
      {/* </SmartWalletsProvider> */}
    </PrivyProvider>
  );
};
export default WagmiProvider;
