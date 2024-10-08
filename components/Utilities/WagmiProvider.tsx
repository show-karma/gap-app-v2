"use client";
import { WagmiProvider as Wagmi } from "wagmi";
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import { config } from "@/utilities/wagmi/config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export const queryClient = new QueryClient();

const WagmiProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <Wagmi config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={lightTheme({
            accentColor: "#E40536",
            accentColorForeground: "white",
            borderRadius: "medium",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </Wagmi>
  );
};
export default WagmiProvider;
