import type { JsonRpcSigner, TransactionRequest } from "ethers";
import { getRPCUrlByChainId } from "@/utilities/rpcClient";

/**
 * Wraps a signer so that gas estimation falls back to our configured RPC
 * when the wallet's RPC (e.g. MetaMask) returns an error.
 *
 * Signing and sending still go through the original wallet provider.
 * Only `estimateGas` is retried with the fallback.
 */
export async function wrapSignerWithFallbackGas(
  signer: JsonRpcSigner,
  chainId: number
): Promise<JsonRpcSigner> {
  const rpcUrl = getRPCUrlByChainId(chainId);
  if (!rpcUrl) return signer;

  const originalProvider = signer.provider;
  if (!originalProvider) return signer;

  const originalEstimateGas = originalProvider.estimateGas.bind(originalProvider);

  originalProvider.estimateGas = async (tx: TransactionRequest) => {
    try {
      return await originalEstimateGas(tx);
    } catch {
      const { JsonRpcProvider } = await import("ethers");
      const fallbackProvider = new JsonRpcProvider(rpcUrl);
      return fallbackProvider.estimateGas(tx);
    }
  };

  return signer;
}
