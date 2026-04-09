// Track calls to createPublicClient
const mockCreatePublicClient = vi.fn(() => ({
  chain: { id: 1 },
  transport: {},
  request: vi.fn(),
}));

const mockHttp = vi.fn((url?: string) => ({ url }));

vi.mock("viem", () => ({
  createPublicClient: (...args: unknown[]) => mockCreatePublicClient(...args),
  http: (...args: unknown[]) => mockHttp(...args),
}));

vi.mock("viem/chains", () => ({
  mainnet: { id: 1, rpcUrls: { default: { http: ["https://eth.llamarpc.com"] } } },
  optimism: { id: 10, rpcUrls: { default: { http: ["https://optimism.llamarpc.com"] } } },
  arbitrum: { id: 42161, rpcUrls: { default: { http: ["https://arb.llamarpc.com"] } } },
  base: { id: 8453, rpcUrls: { default: { http: ["https://base.llamarpc.com"] } } },
  baseSepolia: { id: 84532, rpcUrls: { default: { http: ["https://base-sepolia.llamarpc.com"] } } },
  celo: { id: 42220, rpcUrls: { default: { http: ["https://celo.llamarpc.com"] } } },
  lisk: { id: 1135, rpcUrls: { default: { http: ["https://lisk.llamarpc.com"] } } },
  optimismSepolia: {
    id: 11155420,
    rpcUrls: { default: { http: ["https://op-sepolia.llamarpc.com"] } },
  },
  polygon: { id: 137, rpcUrls: { default: { http: ["https://polygon.llamarpc.com"] } } },
  scroll: { id: 534352, rpcUrls: { default: { http: ["https://scroll.llamarpc.com"] } } },
  sei: { id: 1329, rpcUrls: { default: { http: ["https://sei.llamarpc.com"] } } },
  sepolia: { id: 11155111, rpcUrls: { default: { http: ["https://sepolia.llamarpc.com"] } } },
}));

vi.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    RPC: {
      MAINNET: "https://rpc-mainnet.example.com",
      OPTIMISM: "https://rpc-optimism.example.com",
      ARBITRUM: "https://rpc-arbitrum.example.com",
      BASE: "https://rpc-base.example.com",
      BASE_SEPOLIA: "https://rpc-base-sepolia.example.com",
      CELO: "https://rpc-celo.example.com",
      POLYGON: "https://rpc-polygon.example.com",
      OPT_SEPOLIA: "https://rpc-opt-sepolia.example.com",
      SEPOLIA: "https://rpc-sepolia.example.com",
      SEI: "https://rpc-sei.example.com",
      LISK: "https://rpc-lisk.example.com",
      SCROLL: "https://rpc-scroll.example.com",
    },
  },
}));

vi.mock("@/utilities/network", () => ({
  getChainNameById: (id: number) => {
    const map: Record<number, string> = {
      1: "mainnet",
      10: "optimism",
      42161: "arbitrum",
      8453: "base",
      42220: "celo",
      137: "polygon",
      11155420: "optimism-sepolia",
      11155111: "sepolia",
      84532: "base-sepolia",
      1329: "sei",
      1135: "lisk",
      534352: "scroll",
    };
    return map[id] || "unknown";
  },
}));

describe("rpcClient", () => {
  beforeEach(() => {
    mockCreatePublicClient.mockClear();
    mockHttp.mockClear();
    vi.resetModules();
  });

  it("does NOT call createPublicClient at module load time", async () => {
    mockCreatePublicClient.mockClear();
    vi.resetModules();

    await import("@/utilities/rpcClient");

    expect(mockCreatePublicClient).not.toHaveBeenCalled();
  });

  it("returns a valid client when accessing rpcClient['optimism']", async () => {
    vi.resetModules();
    const { rpcClient } = await import("@/utilities/rpcClient");

    const client = rpcClient.optimism;

    expect(client).toBeDefined();
    expect(mockCreatePublicClient).toHaveBeenCalledTimes(1);
    expect(mockCreatePublicClient).toHaveBeenCalledWith(
      expect.objectContaining({
        chain: expect.objectContaining({ id: 10 }),
      })
    );
  });

  it("returns the SAME instance on repeated access (memoization)", async () => {
    vi.resetModules();
    const { rpcClient } = await import("@/utilities/rpcClient");

    const first = rpcClient.optimism;
    const second = rpcClient.optimism;

    expect(first).toBe(second);
    expect(mockCreatePublicClient).toHaveBeenCalledTimes(1);
  });

  it("returns undefined for unknown network names", async () => {
    vi.resetModules();
    const { rpcClient } = await import("@/utilities/rpcClient");

    const client = rpcClient["nonexistent-network" as keyof typeof rpcClient];

    expect(client).toBeUndefined();
    expect(mockCreatePublicClient).not.toHaveBeenCalled();
  });

  describe("getRPCClient", () => {
    it("returns a client for a valid chain ID", async () => {
      vi.resetModules();
      const { getRPCClient } = await import("@/utilities/rpcClient");

      const client = await getRPCClient(10);

      expect(client).toBeDefined();
      expect(mockCreatePublicClient).toHaveBeenCalledTimes(1);
    });

    it("throws for unknown chain IDs", async () => {
      vi.resetModules();
      const { getRPCClient } = await import("@/utilities/rpcClient");

      await expect(getRPCClient(99999)).rejects.toThrow(
        "RPC client not configured for chain 99999"
      );
    });
  });

  describe("getRPCUrlByChainId", () => {
    it("returns configured RPC URL when available", async () => {
      vi.resetModules();
      const { getRPCUrlByChainId } = await import("@/utilities/rpcClient");

      const url = getRPCUrlByChainId(10);

      expect(url).toBe("https://rpc-optimism.example.com");
    });

    it("falls back to default RPC URL when configured URL is empty", async () => {
      vi.resetModules();

      // Override envVars to have empty OPTIMISM RPC
      vi.doMock("@/utilities/enviromentVars", () => ({
        envVars: {
          RPC: {
            MAINNET: "",
            OPTIMISM: "",
            ARBITRUM: "",
            BASE: "",
            BASE_SEPOLIA: "",
            CELO: "",
            POLYGON: "",
            OPT_SEPOLIA: "",
            SEPOLIA: "",
            SEI: "",
            LISK: "",
            SCROLL: "",
          },
        },
      }));

      const { getRPCUrlByChainId } = await import("@/utilities/rpcClient");

      const url = getRPCUrlByChainId(10);

      expect(url).toBe("https://optimism.llamarpc.com");
    });
  });
});
