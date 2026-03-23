/**
 * Tests for privyBridgeConnector — the wagmi connector that syncs
 * Privy wallet state to the outer wagmi config.
 */

// Mock @wagmi/core's createConnector to just call the factory with a mock config
jest.mock("@wagmi/core", () => ({
  createConnector: (factory: any) => {
    const mockEmitter = { emit: jest.fn() };
    return factory({ emitter: mockEmitter });
  },
}));

jest.mock("@/utilities/network", () => ({
  appNetwork: [
    {
      id: 137,
      name: "Polygon",
      nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
      rpcUrls: { default: { http: ["https://polygon-rpc.com"] } },
    },
    {
      id: 10,
      name: "Optimism",
      nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: ["https://mainnet.optimism.io"] } },
    },
  ],
}));

import { privyBridgeConnector } from "../privy-bridge-connector";

const mockProvider = { request: jest.fn() };
const mockWallet = {
  address: "0x9b750f08b73D7441d4A0eFF112648764613019A4",
  walletClientType: "metamask",
  switchChain: jest.fn(),
  getEthereumProvider: jest.fn().mockResolvedValue(mockProvider),
} as any;

describe("privyBridgeConnector", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("connect returns the wallet address and chain ID", async () => {
    const connector = privyBridgeConnector(mockWallet, 137);
    const result = await connector.connect({});
    expect(result.accounts).toEqual(["0x9b750f08b73D7441d4A0eFF112648764613019A4"]);
    expect(result.chainId).toBe(137);
  });

  it("getAccounts returns the wallet address", async () => {
    const connector = privyBridgeConnector(mockWallet, 137);
    const accounts = await connector.getAccounts();
    expect(accounts).toEqual(["0x9b750f08b73D7441d4A0eFF112648764613019A4"]);
  });

  it("getChainId returns the initial chain ID", async () => {
    const connector = privyBridgeConnector(mockWallet, 137);
    const chainId = await connector.getChainId();
    expect(chainId).toBe(137);
  });

  it("switchChain delegates to wallet.switchChain and returns chain", async () => {
    const connector = privyBridgeConnector(mockWallet, 137);
    const chain = await connector.switchChain({ chainId: 10 });
    expect(mockWallet.switchChain).toHaveBeenCalledWith(10);
    expect(chain.id).toBe(10);
  });

  it("getProvider returns the wallet EIP-1193 provider", async () => {
    const connector = privyBridgeConnector(mockWallet, 137);
    const provider = await connector.getProvider();
    expect(provider).toBe(mockProvider);
    expect(mockWallet.getEthereumProvider).toHaveBeenCalled();
  });

  it("isAuthorized returns true", async () => {
    const connector = privyBridgeConnector(mockWallet, 137);
    const authorized = await connector.isAuthorized();
    expect(authorized).toBe(true);
  });

  it("connect switches chain when target differs from initial", async () => {
    const connector = privyBridgeConnector(mockWallet, 137);
    await connector.connect({ chainId: 10 });
    expect(mockWallet.switchChain).toHaveBeenCalledWith(10);
  });

  it("connect does not switch chain when target matches initial", async () => {
    const connector = privyBridgeConnector(mockWallet, 137);
    await connector.connect({ chainId: 137 });
    expect(mockWallet.switchChain).not.toHaveBeenCalled();
  });
});
