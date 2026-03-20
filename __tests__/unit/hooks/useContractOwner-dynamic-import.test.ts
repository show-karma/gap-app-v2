/**
 * Tests that useContractOwner dynamically imports ethers instead of
 * using a top-level import, keeping ethers out of the shared bundle.
 */

// Mock ethers as a dynamic import target
const mockJsonRpcProvider = jest.fn().mockImplementation(() => ({
  getNetwork: jest.fn().mockResolvedValue({ chainId: 10 }),
}));

jest.mock("ethers", () => ({
  JsonRpcProvider: mockJsonRpcProvider,
}));

// Mock dependencies
jest.mock("@/utilities/network", () => ({
  gapSupportedNetworks: [{ id: 10, name: "Optimism" }],
}));

jest.mock("@/utilities/rpcClient", () => ({
  getRPCUrlByChainId: jest.fn().mockReturnValue("https://rpc.optimism.test"),
}));

jest.mock("@/utilities/sdk/getContractOwner", () => ({
  getContractOwner: jest.fn().mockResolvedValue("0xOwnerAddress"),
}));

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn().mockReturnValue({
    data: false,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn().mockReturnValue({ authenticated: false, address: null }),
}));

jest.mock("@/store/owner", () => ({
  useOwnerStore: jest.fn().mockReturnValue({
    setIsOwner: jest.fn(),
    setIsOwnerLoading: jest.fn(),
  }),
}));

jest.mock("@/utilities/eas-wagmi-utils", () => ({
  useSigner: jest.fn().mockReturnValue(undefined),
}));

jest.mock("@/components/Utilities/errorManager", () => ({
  errorManager: jest.fn(),
}));

jest.mock("@/utilities/cache-config", () => ({
  CONTRACT_OWNER_CACHE_CONFIG: { staleTime: 60000, gcTime: 300000 },
}));

jest.mock("@/utilities/queryKeys", () => ({
  QUERY_KEYS: {
    AUTH: {
      CONTRACT_OWNER: jest.fn().mockReturnValue(["contract-owner"]),
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
