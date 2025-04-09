import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
jest.setTimeout(30000);

// Mock our custom useConnectModal hook
jest.mock("@/hooks/useConnectModal", () => ({
  useConnectModal: () => ({
    openConnectModal: () => {},
    connectModalOpen: false,
  }),
}));

// Mock Privy hooks
jest.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({
    login: () => {},
    authenticated: false,
    user: null,
    ready: true,
  }),
}));

jest.mock("@rainbow-me/rainbowkit", () => ({
  wallet: {
    metaMask: () => {},
    rainbow: () => {},
    coinbase: () => {},
    walletConnect: () => {},
    ledger: () => {},
    brave: () => {},
    trust: () => {},
  },
  connectorsForWallets: () => {},
  useConnectModal: () => ({
    openConnectModal: () => {},
  }),
}));
