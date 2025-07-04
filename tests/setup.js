import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
jest.setTimeout(30000);

jest.mock("@dynamic-labs/sdk-react-core", () => ({
  DynamicContextProvider: ({ children }) => children,
  DynamicWidget: () => <div data-testid="dynamic-widget">Connect Wallet</div>,
  useDynamicContext: () => ({
    setShowAuthFlow: jest.fn(),
    user: null,
    isAuthenticated: false,
  }),
}));

jest.mock("@dynamic-labs/ethereum", () => ({
  EthereumWalletConnectors: [],
}));

jest.mock("@dynamic-labs/ethereum-aa", () => ({
  ZeroDevSmartWalletConnectors: [],
}));

jest.mock("@dynamic-labs/wagmi-connector", () => ({
  DynamicWagmiConnector: () => ({}),
}));
