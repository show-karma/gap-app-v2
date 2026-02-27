/**
 * Mock for useZeroDevSigner hook to avoid ESM parsing issues.
 * The actual hook imports gasless utilities which use ESM-only packages.
 *
 * The real hook returns: { getAttestationSigner, isGaslessAvailable, attestationAddress,
 *                          hasEmbeddedWallet, hasExternalWallet }
 */

export const useZeroDevSigner = jest.fn().mockReturnValue({
  getAttestationSigner: jest.fn().mockResolvedValue({ signMessage: jest.fn() }),
  isGaslessAvailable: false,
  attestationAddress: null,
  hasEmbeddedWallet: false,
  hasExternalWallet: false,
  // Legacy aliases for backward compatibility
  getSignerForChain: jest.fn().mockResolvedValue(null),
  isLoading: false,
  error: null,
});
