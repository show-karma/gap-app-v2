import { optimismSepolia as sepoliaViem } from "viem/chains";
import { envVars } from "../enviromentVars";

export const optimismSepolia = {
  ...sepoliaViem,
  rpcUrls: {
    default: {
      http: [envVars.RPC.OPT_SEPOLIA],
    },
  },
};
