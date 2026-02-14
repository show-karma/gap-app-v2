/**
 * Stub for x402/client — eliminates ~1.3MB of @solana-program dependencies.
 *
 * The x402 payment protocol is a hard dependency of @privy-io/react-auth but
 * is never used by this app (no useX402Fetch calls). Privy's internal import
 * of x402/client pulls in @solana-program/token, @solana-program/token-2022,
 * and other Solana libraries despite this app being EVM-only.
 *
 * These no-op stubs satisfy the import without loading any Solana code.
 */

export function createPaymentHeader() {
  throw new Error("x402 payment protocol is not supported in this application");
}

export function preparePaymentHeader() {
  throw new Error("x402 payment protocol is not supported in this application");
}

export function selectPaymentRequirements() {
  throw new Error("x402 payment protocol is not supported in this application");
}

export function signPaymentHeader() {
  throw new Error("x402 payment protocol is not supported in this application");
}
