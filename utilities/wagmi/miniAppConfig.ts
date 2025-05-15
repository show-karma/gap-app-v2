import { http, createConfig, createStorage, cookieStorage } from "@wagmi/core";
import { celo, base } from "@wagmi/core/chains";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { appNetwork } from "../network";
import { envVars } from "../enviromentVars";

export const miniAppWagmiConfig = createConfig({
  chains: appNetwork,
  connectors: [farcasterFrame()],
  transports: {
    [celo.id]: http(envVars.RPC.CELO),
    [base.id]: http(),
  },
  ssr: false,
  storage: createStorage({
    storage: cookieStorage,
  }),
});
