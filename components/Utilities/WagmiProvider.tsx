"use client";
import { WagmiProvider as Wagmi } from '@privy-io/wagmi';
import { config } from "@/utilities/wagmi/config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivyProvider } from '@privy-io/react-auth';
import type { PrivyClientConfig } from '@privy-io/react-auth';
import { appNetwork } from '@/utilities/network';

export const queryClient = new QueryClient();

// Replace this with your Privy config
export const privyConfig: PrivyClientConfig = {
  embeddedWallets: {
    createOnLogin: 'users-without-wallets',
    requireUserPasswordOnCreate: true,
    noPromptOnSignature: false,
  },
  loginMethods: ["wallet", "email", "google"],
  appearance: {
    walletChainType: 'ethereum-only',
    showWalletLoginFirst: true,
    theme: 'light',
    accentColor: '#E40536',
    logo: 'https://gap.karmahq.xyz/logo/karma-gap-logo2.png',
  },
  supportedChains: appNetwork,
};

const WagmiProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <PrivyProvider
      appId={`${process.env.NEXT_PUBLIC_PRIVY_APP_ID}`}
      config={privyConfig}
    >
      <QueryClientProvider client={queryClient}>
        <Wagmi config={config}>
          {children}
        </Wagmi>
      </QueryClientProvider>
    </PrivyProvider>

  );
};
export default WagmiProvider;
