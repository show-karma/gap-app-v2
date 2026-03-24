import { vi } from "vitest";
/**
 * Mock for useZeroDevSigner hook to avoid ESM parsing issues.
 * The actual hook imports gasless utilities which use ESM-only packages.
 *
 * The real hook returns: { getAttestationSigner, isGaslessAvailable, attestationAddress,
 *                          hasEmbeddedWallet, hasExternalWallet }
 */

export const useZeroDevSigner = vi.fn().mockReturnValue({
  getAttestationSigner: vi.fn().mockResolvedValue({ signMessage: vi.fn() }),
  isGaslessAvailable: false,
  attestationAddress: null,
  hasEmbeddedWallet: false,
  hasExternalWallet: false,
  // Legacy aliases for backward compatibility
  getSignerForChain: vi.fn().mockResolvedValue(null),
  isLoading: false,
  error: null,
});
