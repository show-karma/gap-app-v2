/**
 * Mock for @wagmi/core to handle ESM imports in Jest
 */

export const createConfig = vi.fn(() => ({}));
export const http = vi.fn((url: string) => ({
  url,
  type: "http",
}));
export const getAccount = vi.fn(() => ({
  address: undefined,
  isConnected: false,
}));
export const getConnections = vi.fn(() => []);
export const disconnect = vi.fn();
export const watchAccount = vi.fn();
export const reconnect = vi.fn();
