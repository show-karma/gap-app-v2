import type { GAPRpcConfig } from "@show-karma/karma-gap-sdk";
import { chainIdToNetwork } from "@show-karma/karma-gap-sdk/core/consts";
import { getRPCUrlByChainId } from "@/utilities/rpcClient";

const rpcConfig: GAPRpcConfig = Object.fromEntries(
  Object.keys(chainIdToNetwork)
    .map(Number)
    .map((chainId) => [chainId, getRPCUrlByChainId(chainId)])
    .filter(([, url]) => url)
);

export const getGapRpcConfig = (): GAPRpcConfig => rpcConfig;
