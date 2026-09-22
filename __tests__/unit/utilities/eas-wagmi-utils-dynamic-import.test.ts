/**
 * Tests that eas-wagmi-utils dynamically imports ethers instead of
 * using top-level imports, keeping ethers out of the shared bundle.
 */

const { mockJsonRpcProvider, mockFallbackProvider, mockBrowserProvider, mockJsonRpcSigner } =
  vi.hoisted(() => {
    const mockJsonRpcProvider = vi.fn();
    const mockFallbackProvider = vi.fn();
    const mockBrowserProvider = vi.fn();
    const mockJsonRpcSigner = vi.fn();
    return { mockJsonRpcProvider, mockFallbackProvider, mockBrowserProvider, mockJsonRpcSigner };
  });

vi.mock("ethers", () => {
  // Create proper constructor classes that delegate to spy fns
  class MockJsonRpcProvider {
    constructor(...args: unknown[]) {
      mockJsonRpcProvider(...args);
      Object.assign(this, { url: args[0], _network: args[1] });
    }
  }
  class MockFallbackProvider {
    constructor(...args: unknown[]) {
      mockFallbackProvider(...args);
      Object.assign(this, { providers: args[0] });
    }
  }
  class MockBrowserProvider {
    constructor(...args: unknown[]) {
      mockBrowserProvider(...args);
      Object.assign(this, { transport: args[0], _network: args[1] });
    }
  }
  class MockJsonRpcSigner {
    constructor(...args: unknown[]) {
      mockJsonRpcSigner(...args);
      Object.assign(this, { provider: args[0], address: args[1] });
    }
  }
  return {
    JsonRpcProvider: MockJsonRpcProvider,
    FallbackProvider: MockFallbackProvider,
    BrowserProvider: MockBrowserProvider,
    JsonRpcSigner: MockJsonRpcSigner,
  };
});

vi.mock("wagmi", () => ({
  usePublicClient: vi.fn().mockReturnValue(null),
  useWalletClient: vi.fn().mockReturnValue({ data: null }),
}));

describe("eas-wagmi-utils dynamic imports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("publicClientToProvider", () => {
    it("should dynamically import ethers and create JsonRpcProvider", async () => {
      const { publicClientToProvider } = await import("@/utilities/eas-wagmi-utils");

      const mockClient = {
        chain: {
          id: 10,
          name: "Optimism",
          contracts: { ensRegistry: { address: "0xens" } },
        },
        transport: {
          type: "default",
          url: "https://rpc.optimism.test",
        },
      } as any;

      const result = await publicClientToProvider(mockClient);

      expect(mockJsonRpcProvider).toHaveBeenCalledWith("https://rpc.optimism.test", {
        chainId: 10,
        name: "Optimism",
        ensAddress: "0xens",
      });
      expect(result).toBeDefined();
    });

    it("should return undefined when chain is missing", async () => {
      const { publicClientToProvider } = await import("@/utilities/eas-wagmi-utils");

      const mockClient = {
        chain: undefined,
        transport: { type: "default", url: "https://rpc.test" },
      } as any;

      const result = await publicClientToProvider(mockClient);

      expect(result).toBeUndefined();
    });

    it("should use FallbackProvider for fallback transport", async () => {
      const { publicClientToProvider } = await import("@/utilities/eas-wagmi-utils");

      const mockClient = {
        chain: {
          id: 10,
          name: "Optimism",
          contracts: {},
        },
        transport: {
          type: "fallback",
          transports: [
            { value: { url: "https://rpc1.test" } },
            { value: { url: "https://rpc2.test" } },
          ],
        },
      } as any;

      const result = await publicClientToProvider(mockClient);

      expect(mockJsonRpcProvider).toHaveBeenCalledTimes(2);
      expect(mockFallbackProvider).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it("should return single provider for fallback transport with one entry", async () => {
      const { publicClientToProvider } = await import("@/utilities/eas-wagmi-utils");

      const mockClient = {
        chain: {
          id: 10,
          name: "Optimism",
          contracts: {},
        },
        transport: {
          type: "fallback",
          transports: [{ value: { url: "https://rpc1.test" } }],
        },
      } as any;

      const result = await publicClientToProvider(mockClient);

      expect(mockJsonRpcProvider).toHaveBeenCalledTimes(1);
      expect(mockFallbackProvider).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe("walletClientToSigner", () => {
    it("should dynamically import ethers and create signer", async () => {
      const { walletClientToSigner } = await import("@/utilities/eas-wagmi-utils");

      const mockClient = {
        account: { address: "0xUserAddress" },
        chain: {
          id: 10,
          name: "Optimism",
          contracts: { ensRegistry: { address: "0xens" } },
        },
        transport: { type: "default" },
      } as any;

      const result = await walletClientToSigner(mockClient);

      expect(mockBrowserProvider).toHaveBeenCalledWith(
        { type: "default" },
        {
          chainId: 10,
          name: "Optimism",
          ensAddress: "0xens",
        }
      );
      expect(mockJsonRpcSigner).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should return undefined when chain is missing", async () => {
      const { walletClientToSigner } = await import("@/utilities/eas-wagmi-utils");

      const mockClient = {
        account: { address: "0xUserAddress" },
        chain: undefined,
        transport: { type: "default" },
      } as any;

      const result = await walletClientToSigner(mockClient);

      expect(result).toBeUndefined();
    });
  });
});
