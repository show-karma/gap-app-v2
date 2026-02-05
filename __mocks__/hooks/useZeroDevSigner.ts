/**
 * Mock for useZeroDevSigner hook to avoid ESM parsing issues
 * The actual hook imports gasless utilities which use ESM-only packages.
 */

export const useZeroDevSigner = jest.fn().mockReturnValue({
  getSignerForChain: jest.fn().mockResolvedValue(null),
  isLoading: false,
  error: null,
});
