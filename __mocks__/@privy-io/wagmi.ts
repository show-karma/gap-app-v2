/**
 * Mock for @privy-io/wagmi
 */
export const useWagmiConfig = jest.fn(() => ({}));
export const createConfig = jest.fn(() => ({}));
export const useSetActiveWallet = jest.fn(() => ({ setActiveWallet: jest.fn() }));
