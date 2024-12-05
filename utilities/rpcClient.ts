import { createPublicClient, http } from "viem";
import {
  arbitrum,
  baseSepolia,
  celo,
  optimism,
  optimismSepolia,
  sei,
  sepolia,
} from "viem/chains";
import { envVars } from "./enviromentVars";

const optimismClient = createPublicClient({
  chain: optimism,
  transport: http(envVars.RPC.OPTIMISM),
});

const arbitrumClient = createPublicClient({
  chain: arbitrum,
  transport: http(envVars.RPC.ARBITRUM),
});

const baseSepoliaClient = createPublicClient({
  chain: baseSepolia,
  transport: http(envVars.RPC.BASE_SEPOLIA),
});

const optimismSepoliaClient = createPublicClient({
  chain: optimismSepolia,
  transport: http(envVars.RPC.OPT_SEPOLIA),
});

const sepoliaClient = createPublicClient({
  chain: sepolia,
  transport: http(envVars.RPC.SEPOLIA),
});

const celoClient = createPublicClient({
  chain: celo,
  transport: http(envVars.RPC.CELO),
});

const seiClient = createPublicClient({
  chain: sei,
  transport: http(envVars.RPC.SEI),
});

export const rpcClient = {
  //   prod networks
  optimism: optimismClient,
  sei: seiClient,
  arbitrum: arbitrumClient,
  celo: celoClient,
  //   testnets
  optimismSepolia: optimismSepoliaClient,
  sepolia: sepoliaClient,
  baseSepolia: baseSepoliaClient,
};
