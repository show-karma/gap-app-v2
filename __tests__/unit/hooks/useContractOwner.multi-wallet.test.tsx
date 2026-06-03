/**
 * Regression tests: the global EAS contract-owner check must match the owner
 * against EVERY wallet linked to the authenticated account, not only the active
 * one. A single Privy account can hold multiple embedded wallets and the owner
 * role may sit on a non-active one.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useContractOwner } from "@/hooks/useContractOwner";
import { getContractOwner } from "@/utilities/sdk/getContractOwner";

vi.mock("ethers", () => ({
  // Must be constructable (`new JsonRpcProvider(...)`), so use a class, not an
  // arrow function.
  JsonRpcProvider: class {},
}));

vi.mock("@/utilities/network", () => ({
  gapSupportedNetworks: [{ id: 10, name: "Optimism" }],
}));

vi.mock("@/utilities/rpcClient", () => ({
  getRPCUrlByChainId: vi.fn().mockReturnValue("https://rpc.optimism.test"),
}));

vi.mock("@/utilities/sdk/getContractOwner", () => ({
  getContractOwner: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/store/owner", () => ({
  useOwnerStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({ setIsOwner: vi.fn(), setIsOwnerLoading: vi.fn() })
  ),
}));

vi.mock("@/utilities/eas-wagmi-utils", () => ({
  useSigner: vi.fn().mockReturnValue(undefined),
}));

vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

vi.mock("@/utilities/cache-config", () => ({
  CONTRACT_OWNER_CACHE_CONFIG: { staleTime: 0, gcTime: 0 },
}));

vi.mock("@/utilities/queryKeys", () => ({
  QUERY_KEYS: {
    AUTH: {
      CONTRACT_OWNER: (walletsKey?: string, chainId?: number) => [
        "contract-owner",
        walletsKey,
        chainId,
      ],
    },
  },
}));

const mockUseAuth = useAuth as unknown as vi.Mock;
const mockGetContractOwner = getContractOwner as unknown as vi.Mock;

const ACTIVE = "0xActiveWalletaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const OWNER = "0xOwnerWalletbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useContractOwner — multi-wallet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is owner when the contract owner matches a non-active linked wallet", async () => {
    mockUseAuth.mockReturnValue({
      authenticated: true,
      address: ACTIVE,
      user: {
        linkedAccounts: [
          { type: "wallet", address: ACTIVE },
          { type: "wallet", address: OWNER },
        ],
      },
    });
    // On-chain owner is the NON-active linked wallet.
    mockGetContractOwner.mockResolvedValue(OWNER);

    const { result } = renderHook(() => useContractOwner(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.data).toBe(true);
    });
  });

  it("is not owner when no linked wallet matches the contract owner", async () => {
    mockUseAuth.mockReturnValue({
      authenticated: true,
      address: ACTIVE,
      user: {
        linkedAccounts: [
          { type: "wallet", address: ACTIVE },
          { type: "wallet", address: OWNER },
        ],
      },
    });
    mockGetContractOwner.mockResolvedValue("0xUnrelatedccccccccccccccccccccccccccccc1");

    const { result } = renderHook(() => useContractOwner(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.data).toBe(false);
  });
});
