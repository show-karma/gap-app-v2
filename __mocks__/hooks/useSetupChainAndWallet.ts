import { vi } from "vitest";
/**
 * Mock for useSetupChainAndWallet hook to avoid ESM parsing issues.
 * The actual hook imports useZeroDevSigner which imports gasless utilities.
 *
 * Tests can override the return value via:
 *   const mockModule = require("@/hooks/useSetupChainAndWallet");
 *   mockModule.useSetupChainAndWallet.mockReturnValue({ setupChainAndWallet: myMock, ... });
 */

<<<<<<< HEAD
/**
 * Mock for useSetupChainAndWallet hook to avoid ESM parsing issues.
 * The actual hook imports useZeroDevSigner which imports gasless utilities.
 *
 * NOTE: Due to SWC resolving @/ aliases at compile time, this moduleNameMapper-based
 * mock only works for direct requires from test files, NOT for imports within other
 * source modules. Tests that need to mock useSetupChainAndWallet for hooks that import
 * it should use jest.mock with a relative path from the test file to the actual hook file.
 *
 * Example:
 *   const mockSetupFn = jest.fn();
 *   jest.mock("../../../hooks/useSetupChainAndWallet", () => ({
 *     useSetupChainAndWallet: jest.fn(() => ({ setupChainAndWallet: mockSetupFn, ... })),
 *   }));
 */

export const useSetupChainAndWallet = jest.fn().mockReturnValue({
  setupChainAndWallet: jest.fn().mockResolvedValue(null),
=======
export const useSetupChainAndWallet = vi.fn().mockReturnValue({
  setupChainAndWallet: vi.fn().mockResolvedValue(null),
>>>>>>> 8322801b (test: migrate Jest to Vitest for unit/integration tests)
  isSmartWalletReady: false,
  smartWalletAddress: null,
  hasEmbeddedWallet: false,
  hasExternalWallet: false,
});
