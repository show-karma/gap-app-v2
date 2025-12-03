/**
 * Mock for @wagmi/core to handle ESM imports in Jest
 */

export const createConfig = jest.fn(() => ({}));
export const http = jest.fn((url: string) => ({
  url,
  type: "http",
}));
export const getAccount = jest.fn(() => ({
  address: undefined,
  isConnected: false,
}));
export const getConnections = jest.fn(() => []);
export const disconnect = jest.fn();
export const watchAccount = jest.fn();
export const reconnect = jest.fn();
