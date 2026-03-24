import { vi } from "vitest";
/**
 * Mock for @privy-io/wagmi
 */
export const useWagmiConfig = vi.fn(() => ({}));
export const createConfig = vi.fn(() => ({}));
export const useSetActiveWallet = vi.fn(() => ({ setActiveWallet: vi.fn() }));
