/**
 * Detects whether a wallet/transaction error represents the user intentionally
 * cancelling or rejecting the operation (as opposed to a hard failure).
 *
 * Covers MetaMask (code 4001, "User rejected"), Privy embedded wallet
 * ("Signature rejected"), and other common wallet providers ("user denied",
 * "user cancelled", "user canceled"). Also unwraps errors nested under
 * `originalError`.
 */
interface WalletErrorLayer {
  message?: unknown;
  code?: unknown;
  name?: unknown;
  originalError?: unknown;
}

export function isUserCancellationError(error: unknown): boolean {
  const err = error as WalletErrorLayer | null | undefined;
  const layers = [err, err?.originalError as WalletErrorLayer | undefined].filter(Boolean);

  return layers.some((layer) => {
    const msg = typeof layer?.message === "string" ? layer.message.toLowerCase() : "";
    return (
      layer?.code === 4001 ||
      msg.includes("user rejected") ||
      msg.includes("user denied") ||
      msg.includes("user cancelled") ||
      msg.includes("user canceled") ||
      msg.includes("signature rejected") ||
      layer?.name === "UserRejectedRequestError"
    );
  });
}
