import { chainIdToNetwork } from "@show-karma/karma-gap-sdk/core/consts";
import { getRPCUrlByChainId } from "@/utilities/rpcClient";

type GapRpcConfig = Record<number, string>;

const rpcConfig: GapRpcConfig = Object.fromEntries(
  Object.keys(chainIdToNetwork)
    .map(Number)
    .map((chainId) => [chainId, getRPCUrlByChainId(chainId)])
    .filter(([, url]) => url)
);

export const getGapRpcConfig = (): GapRpcConfig => rpcConfig;
