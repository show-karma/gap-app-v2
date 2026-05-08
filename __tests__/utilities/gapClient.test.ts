import "@testing-library/jest-dom";

// Use vi.hoisted() so mock functions are available when vi.mock() factories run
const { mockGAP, mockGapIndexerClient } = vi.hoisted(() => {
  // Must use function() (not arrow) so it can be called with `new`
  const gapFn = vi.fn(function (this: Record<string, unknown>) {
    this.fetch = { projectById: vi.fn(), projectBySlug: vi.fn() };
  });
  // Must use function() (not arrow) so it can be called with `new`
  const indexerFn = vi.fn(function (this: Record<string, unknown>) {
    Object.assign(this, {});
  });
  return { mockGAP: gapFn, mockGapIndexerClient: indexerFn };
});

vi.mock("@show-karma/karma-gap-sdk/core/class/GAP", () => ({
  GAP: mockGAP,
}));

vi.mock("@show-karma/karma-gap-sdk/core/class/karma-indexer/GapIndexerClient", () => ({
  GapIndexerClient: mockGapIndexerClient,
}));

vi.mock("@show-karma/karma-gap-sdk/core/consts", () => ({
  Networks: {
    "optimism-sepolia": { chainId: 11155420 },
    optimism: { chainId: 10 },
  },
}));

vi.mock("@/utilities/enviromentVars", () => ({
  envVars: { NEXT_PUBLIC_GAP_INDEXER_URL: "https://indexer.example.com" },
}));

vi.mock("@/utilities/gapRpcConfig", () => ({
  getGapRpcConfig: () => ({}),
}));

vi.mock("@/utilities/network", () => ({
  appNetwork: [{ id: 10 }, { id: 11155420 }],
  getChainIdByName: (name: string) => {
    const map: Record<string, number> = { optimism: 10, "optimism-sepolia": 11155420 };
    return map[name] ?? 0;
  },
  getChainNameById: (id: number) => {
    const map: Record<number, string> = { 10: "optimism", 11155420: "optimism-sepolia" };
    return map[id] ?? "unknown";
  },
}));

describe("gapClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the module to clear cached clients between tests
    vi.resetModules();
  });

  it("should NOT eagerly initialize all networks on import", async () => {
    // Import the module fresh
    const { getGapClient } = await import("@/utilities/gapClient");

    // Before any getGapClient call, GAP constructor should NOT have been called
    expect(mockGAP).not.toHaveBeenCalled();
  });

  it("should lazily create GAP instance only for the requested chain", async () => {
    const { getGapClient } = await import("@/utilities/gapClient");

    const client = getGapClient(10);

    // GAP should be created only once for chain 10
    expect(mockGAP).toHaveBeenCalledTimes(1);
    expect(mockGAP).toHaveBeenCalledWith(expect.objectContaining({ network: "optimism" }));
    expect(client).toBeDefined();
  });

  it("should cache and reuse GAP instances", async () => {
    const { getGapClient } = await import("@/utilities/gapClient");

    const client1 = getGapClient(10);
    const client2 = getGapClient(10);

    expect(mockGAP).toHaveBeenCalledTimes(1);
    expect(client1).toBe(client2);
  });

  it("should throw for unsupported chains", async () => {
    const { getGapClient } = await import("@/utilities/gapClient");

    expect(() => getGapClient(999999)).toThrow("GAP::Unsupported chain 999999");
  });

  it("should return a default chain ID", async () => {
    const { getDefaultGapChainId } = await import("@/utilities/gapClient");

    const defaultId = getDefaultGapChainId();
    expect(defaultId).toBeDefined();
    expect([10, 11155420]).toContain(defaultId);
  });
});
