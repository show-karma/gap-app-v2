/**
 * Detects whether a wallet/transaction error represents the user intentionally
 * cancelling or rejecting the operation (as opposed to a hard failure).
 *
 * Covers MetaMask (code 4001, "User rejected"), Privy embedded wallet
 * ("Signature rejected"), and other common wallet providers ("user denied",
 * "user cancelled"). Also unwraps errors nested under `originalError`.
 */
export function isUserCancellationError(error: unknown): boolean {
  const err = error as Record<string, any> | null | undefined;
  const inner = err?.originalError ?? err;
  const msg = (inner?.message ?? "").toLowerCase();
  const code = inner?.code;

  return (
    code === 4001 ||
    msg.includes("user rejected") ||
    msg.includes("user denied") ||
    msg.includes("user cancelled") ||
    msg.includes("signature rejected") ||
    inner?.name === "UserRejectedRequestError"
  );
}
