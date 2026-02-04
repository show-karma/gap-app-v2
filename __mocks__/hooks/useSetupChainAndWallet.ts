/**
 * Mock for useSetupChainAndWallet hook to avoid ESM parsing issues
 * The actual hook imports useZeroDevSigner which imports gasless utilities.
 */

export const useSetupChainAndWallet = jest.fn().mockReturnValue({
  handleChainSetup: jest.fn().mockResolvedValue({ success: true }),
  isLoading: false,
  error: null,
});
