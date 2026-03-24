import { vi } from "vitest";
/**
 * Mock for useSetupChainAndWallet hook to avoid ESM parsing issues.
 * The actual hook imports useZeroDevSigner which imports gasless utilities.
 *
 * Tests can override the return value via:
 *   const mockModule = require("@/hooks/useSetupChainAndWallet");
 *   mockModule.useSetupChainAndWallet.mockReturnValue({ setupChainAndWallet: myMock, ... });
 */

export const useSetupChainAndWallet = vi.fn().mockReturnValue({
  setupChainAndWallet: vi.fn().mockResolvedValue(null),
  isSmartWalletReady: false,
  smartWalletAddress: null,
  hasEmbeddedWallet: false,
  hasExternalWallet: false,
});
