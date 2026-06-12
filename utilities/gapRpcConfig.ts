import type { GAPRpcConfig } from "@show-karma/karma-gap-sdk";
import { chainIdToNetwork } from "@show-karma/karma-gap-sdk/core/consts";
import { getRPCUrlByChainId } from "@/utilities/rpcClient";

const rpcConfig: GAPRpcConfig = Object.fromEntries(
  Object.keys(chainIdToNetwork)
    .map(Number)
    .flatMap((chainId) => {
      const url = getRPCUrlByChainId(chainId);
      return url ? [[chainId, url]] : [];
    })
);

export const getGapRpcConfig = (): GAPRpcConfig => rpcConfig;
