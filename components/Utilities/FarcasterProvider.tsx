"use client";
import { cookieToInitialState, WagmiProvider as Wagmi } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { miniAppWagmiConfig } from "@/utilities/wagmi/miniAppConfig";

export const queryClient = new QueryClient();

const FarcasterProvider = ({
  children,
  cookie,
}: {
  cookie: string;
  children: React.ReactNode;
}) => {
  const initialState = cookieToInitialState(miniAppWagmiConfig, cookie);

  return (
    <Wagmi config={miniAppWagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Wagmi>
  );
};
export default FarcasterProvider;
