"use client";
import { cookieToInitialState, WagmiProvider as Wagmi } from "wagmi";
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import { config } from "@/utilities/wagmi/config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: defaultQueryOptions,
  },
});

const WagmiProvider = ({
  children,
  cookie,
}: {
  cookie: string;
  children: React.ReactNode;
}) => {
  const initialState = cookieToInitialState(config, cookie);

  return (
    <Wagmi config={config} initialState={initialState}>
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
