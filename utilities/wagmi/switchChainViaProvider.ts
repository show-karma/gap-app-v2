import type { ConnectedWallet } from "@privy-io/react-auth";
import type { Chain } from "viem/chains";

/**
 * Switch a Privy ConnectedWallet to a target chain by dispatching the EIP-1193
 * request directly on its provider, bypassing Privy's `wallet.switchChain()`.
 *
 * Why: Privy's switchChain looks up the current chainId from its internal
 * `this.wallets` store. Rabby (and a few other wallets) momentarily emit
 * `accountsChanged([])` during chain changes, which causes Privy to clear that
 * store via its onDisconnect handler. Any switchChain call racing that event
 * throws "Unable to determine current chainId." Going through the provider
 * directly avoids the lookup entirely.
 *
 * Falls back to `wallet_addEthereumChain` when the wallet rejects the switch
 * with 4902 / "Unrecognized chain ID" — only when a chain descriptor with a
 * usable RPC URL is provided.
 */
export async function switchChainViaProvider(
  wallet: Pick<ConnectedWallet, "getEthereumProvider">,
  targetChainId: number,
  chainForAdd?: Chain
): Promise<void> {
  const provider = await wallet.getEthereumProvider();
  const hexChainId = `0x${targetChainId.toString(16)}`;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexChainId }],
    });
    return;
  } catch (err) {
    if (!isUnrecognizedChainError(err)) throw err;
    if (!chainForAdd) throw err;

    const rpcUrl = chainForAdd.rpcUrls.default?.http?.[0];
    if (!rpcUrl) throw err;

    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: hexChainId,
          chainName: chainForAdd.name,
          nativeCurrency: chainForAdd.nativeCurrency,
          rpcUrls: [rpcUrl],
          blockExplorerUrls: chainForAdd.blockExplorers?.default?.url
            ? [chainForAdd.blockExplorers.default.url]
            : undefined,
        },
      ],
    });

    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexChainId }],
    });
  }
}

function isUnrecognizedChainError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: unknown }).code;
  if (code === 4902) return true;
  const message = (err as { message?: unknown }).message;
  return (
    typeof message === "string" &&
    /Unrecognized chain ID|chain.+not.+added|wallet_addEthereumChain/i.test(message)
  );
}
