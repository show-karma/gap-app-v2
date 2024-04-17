import { envVars } from "./enviromentVars";

export const getRPCByChainId = (chainId: number) => {
  const rpc: Record<
    number,
    {
      http: string;
    }
  > = {
    10: {
      http: envVars.RPC.OPTIMISM,
    },
    42161: {
      http: envVars.RPC.ARBITRUM,
    },
    11155420: {
      http: envVars.RPC.OPT_SEPOLIA,
    },
  };
  return rpc[chainId] || rpc[10];
};
