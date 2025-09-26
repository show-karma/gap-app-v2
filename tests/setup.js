import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
jest.setTimeout(30000);

// Mock Privy instead of RainbowKit
jest.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({
    ready: true,
    authenticated: false,
    login: jest.fn(),
    logout: jest.fn(),
    user: null,
    getAccessToken: jest.fn(),
  }),
  useWallets: () => ({
    wallets: [],
    ready: true,
  }),
  useLogin: () => ({
    login: jest.fn(),
  }),
  useLogout: () => ({
    logout: jest.fn(),
  }),
  PrivyProvider: ({ children }) => children,
}));
