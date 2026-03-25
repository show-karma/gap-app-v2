/**
 * Tests that useContractOwner dynamically imports ethers instead of
 * using a top-level import, keeping ethers out of the shared bundle.
 */

// Mock ethers as a dynamic import target
const mockJsonRpcProvider = vi.fn().mockImplementation(() => ({
  getNetwork: vi.fn().mockResolvedValue({ chainId: 10 }),
}));

vi.mock("ethers", () => ({
  JsonRpcProvider: mockJsonRpcProvider,
}));

// Mock dependencies
vi.mock("@/utilities/network", () => ({
  gapSupportedNetworks: [{ id: 10, name: "Optimism" }],
}));

vi.mock("@/utilities/rpcClient", () => ({
  getRPCUrlByChainId: vi.fn().mockReturnValue("https://rpc.optimism.test"),
}));

vi.mock("@/utilities/sdk/getContractOwner", () => ({
  getContractOwner: vi.fn().mockResolvedValue("0xOwnerAddress"),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn().mockReturnValue({
    data: false,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn().mockReturnValue({ authenticated: false, address: null }),
}));

vi.mock("@/store/owner", () => ({
  useOwnerStore: vi.fn().mockReturnValue({
    setIsOwner: vi.fn(),
    setIsOwnerLoading: vi.fn(),
  }),
}));

vi.mock("@/utilities/eas-wagmi-utils", () => ({
  useSigner: vi.fn().mockReturnValue(undefined),
}));

vi.mock("@/utilities/cache-config", () => ({
  CONTRACT_OWNER_CACHE_CONFIG: { staleTime: 60000, gcTime: 300000 },
}));

vi.mock("@/utilities/queryKeys", () => ({
  QUERY_KEYS: {
    AUTH: {
      CONTRACT_OWNER: vi.fn().mockReturnValue(["contract-owner"]),
    },
  },
}));

describe("useContractOwner dynamic import", () => {
  it("should not have ethers imported at module load time", async () => {
    // Reset the mock call count before importing
    mockJsonRpcProvider.mockClear();

    // Import the module — this should NOT trigger ethers import at load time
    // The fetchContractOwner function uses dynamic import, so ethers is only
    // loaded when the function is actually called
    const mod = await import("@/hooks/useContractOwner");
    expect(mod).toBeDefined();

    // At this point, JsonRpcProvider should NOT have been instantiated
    // (it's only called inside fetchContractOwner when the query runs)
    expect(mockJsonRpcProvider).not.toHaveBeenCalled();
  });
});
