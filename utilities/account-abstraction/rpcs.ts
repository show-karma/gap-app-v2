import { baseSepolia, optimismSepolia, sepolia } from "viem/chains";

export const rpcs: Record<
  number,
  {
    paymaster: string;
    bundler: string;
  }
> = {
  [optimismSepolia.id]: {
    paymaster:
      "https://rpc.zerodev.app/api/v2/paymaster/b544be61-1477-4540-a5c3-5325cd4596f3",
    bundler:
      "https://rpc.zerodev.app/api/v2/bundler/b544be61-1477-4540-a5c3-5325cd4596f3",
  },
  [baseSepolia.id]: {
    paymaster:
      "https://rpc.zerodev.app/api/v2/paymaster/82652235-76ab-43f3-8b91-73ce66ee6d07",
    bundler:
      "https://rpc.zerodev.app/api/v2/bundler/82652235-76ab-43f3-8b91-73ce66ee6d07",
  },
  [sepolia.id]: {
    paymaster:
      "https://rpc.zerodev.app/api/v2/paymaster/9addcea0-f0be-46d1-ac63-eb034b22e01a",
    bundler:
      "https://rpc.zerodev.app/api/v2/bundler/9addcea0-f0be-46d1-ac63-eb034b22e01a",
  },
};
