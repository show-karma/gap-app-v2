import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { ethers } from "ethers";
import { createElement } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProjectInstance } from "@/hooks/useProjectInstance";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { useProjectStore } from "@/store";
import { compareAllWallets, getLinkedWalletAddresses } from "@/utilities/auth/compare-all-wallets";
import { getRPCUrlByChainId } from "@/utilities/rpcClient";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/store", () => ({
  useProjectStore: vi.fn(),
}));

vi.mock("@/hooks/useProjectInstance", () => ({
  useProjectInstance: vi.fn(),
}));

vi.mock("@/utilities/rpcClient", () => ({
  getRPCUrlByChainId: vi.fn(),
}));

vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

vi.mock("@/utilities/auth/compare-all-wallets", () => ({
  compareAllWallets: vi.fn(),
  getLinkedWalletAddresses: vi.fn(),
}));

// Override defaultQueryOptions to disable retries in tests (prevents flaky
// 1000ms waitFor timeouts caused by shouldRetry's single-retry delay)
vi.mock("@/utilities/queries/defaultOptions", () => ({
  defaultQueryOptions: {
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    retry: false,
  },
}));

vi.mock("ethers", () => {
  // Must use function() (not arrow) so vi.fn() constructor semantics work correctly
  const MockJsonRpcProvider = vi.fn(function (this: Record<string, unknown>) {
    return this;
  });
  return {
    __esModule: true,
    ethers: { JsonRpcProvider: MockJsonRpcProvider },
    JsonRpcProvider: MockJsonRpcProvider,
  };
});

// Access the mock through the mocked module
const mockJsonRpcProvider = ethers.JsonRpcProvider as unknown as vi.Mock;

const mockUseAuth = useAuth as unknown as vi.Mock;
const mockUseProjectStore = useProjectStore as unknown as vi.Mock;
const mockUseProjectInstance = useProjectInstance as unknown as vi.Mock;
const mockGetRPCUrlByChainId = getRPCUrlByChainId as unknown as vi.Mock;
const mockCompareAllWallets = compareAllWallets as unknown as vi.Mock;
const mockGetLinkedWalletAddresses = getLinkedWalletAddresses as unknown as vi.Mock;

// Fresh QueryClient per render — no afterEach cleanup required
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockSetIsProjectAdmin = vi.fn();
const mockSetIsProjectOwner = vi.fn();

function setupMocks(
  overrides: {
    authenticated?: boolean;
    isConnected?: boolean;
    address?: string | null;
    user?: any;
    project?: any;
    projectInstance?: any;
    rpcUrl?: string | null;
    compareAllWalletsResult?: boolean;
    linkedWalletAddresses?: string[];
  } = {}
) {
  const {
    authenticated = false,
    isConnected = false,
    address = null,
    user = null,
    project = null,
    projectInstance = null,
    rpcUrl = null,
    compareAllWalletsResult = false,
    linkedWalletAddresses = [],
  } = overrides;

  mockUseAuth.mockReturnValue({
    address,
    isConnected,
    authenticated,
    user,
  });

  mockUseProjectStore.mockImplementation((selector: (s: any) => any) => {
    if (typeof selector === "function") {
      return selector({
        project,
        setIsProjectAdmin: mockSetIsProjectAdmin,
        setIsProjectOwner: mockSetIsProjectOwner,
      });
    }
    return {
      project,
      setIsProjectAdmin: mockSetIsProjectAdmin,
      setIsProjectOwner: mockSetIsProjectOwner,
    };
  });

  mockUseProjectInstance.mockReturnValue({ project: projectInstance });
  mockGetRPCUrlByChainId.mockReturnValue(rpcUrl);
  mockCompareAllWallets.mockReturnValue(compareAllWalletsResult);
  mockGetLinkedWalletAddresses.mockReturnValue(linkedWalletAddresses);
}

describe("useProjectPermissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("unauthenticated user", () => {
    it("returns false for both permissions when not authenticated", () => {
      setupMocks();
      const { result } = renderHook(() => useProjectPermissions(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isProjectOwner).toBe(false);
      expect(result.current.isProjectAdmin).toBe(false);
    });

    it("does not call ethers when query is disabled", async () => {
      setupMocks();
      renderHook(() => useProjectPermissions(), {
        wrapper: createWrapper(),
      });

      expect(mockJsonRpcProvider).not.toHaveBeenCalled();
    });
  });

  describe("authenticated user with project", () => {
    const mockProject = {
      uid: "test-project-uid",
      details: { slug: "test-slug" },
      chainID: 1,
      owner: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    };

    const mockUser = {
      linkedAccounts: [{ type: "wallet", address: "0x1234567890abcdef1234567890abcdef12345678" }],
    };

    const createMockProjectInstance = () => ({
      chainID: 1,
      isOwner: vi.fn().mockResolvedValue(true),
      isAdmin: vi.fn().mockResolvedValue(false),
    });

    it("checks permissions when authenticated with a project", async () => {
      const mockProjectInstance = createMockProjectInstance();
      setupMocks({
        authenticated: true,
        isConnected: true,
        address: "0x1234567890abcdef1234567890abcdef12345678",
        user: mockUser,
        project: mockProject,
        projectInstance: mockProjectInstance,
        rpcUrl: "https://rpc.example.com",
      });

      const { result } = renderHook(() => useProjectPermissions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isProjectOwner).toBe(true);
      });

      expect(result.current.isProjectAdmin).toBe(false);
      expect(mockJsonRpcProvider).toHaveBeenCalledWith("https://rpc.example.com");
      expect(mockProjectInstance.isOwner).toHaveBeenCalled();
      expect(mockProjectInstance.isAdmin).toHaveBeenCalled();
    });

    it("returns false when rpcUrl is not available and no API owner match", async () => {
      const mockProjectInstance = createMockProjectInstance();
      setupMocks({
        authenticated: true,
        isConnected: true,
        address: "0x1234567890abcdef1234567890abcdef12345678",
        user: mockUser,
        project: mockProject,
        projectInstance: mockProjectInstance,
        rpcUrl: null,
      });

      const { result } = renderHook(() => useProjectPermissions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isProjectOwner).toBe(false);
      expect(result.current.isProjectAdmin).toBe(false);
    });

    it("returns true for owner when rpcUrl is not available but API owner matches a linked wallet", async () => {
      const mockProjectInstance = createMockProjectInstance();
      mockProjectInstance.isOwner.mockResolvedValue(false);
      setupMocks({
        authenticated: true,
        isConnected: true,
        address: "0x1234567890abcdef1234567890abcdef12345678",
        user: mockUser,
        project: mockProject,
        projectInstance: mockProjectInstance,
        rpcUrl: null,
        compareAllWalletsResult: true,
      });

      const { result } = renderHook(() => useProjectPermissions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isProjectOwner).toBe(true);
      });

      expect(result.current.isProjectAdmin).toBe(false);
    });
  });

  describe("multi-wallet ownership", () => {
    const mockProject = {
      uid: "test-project-uid",
      details: { slug: "test-slug" },
      chainID: 10,
      owner: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    };

    // User created project with MetaMask (0xAAAA...) but primary wallet is now embedded (0x1234...)
    const mockUser = {
      linkedAccounts: [
        {
          type: "wallet",
          address: "0x1234567890abcdef1234567890abcdef12345678",
          walletClientType: "privy",
        },
        {
          type: "wallet",
          address: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
          walletClientType: "metamask",
        },
      ],
    };

    it("should_recognize_owner_when_project_was_created_with_non_primary_wallet", async () => {
      const mockProjectInstance = {
        chainID: 10,
        // On-chain check fails because primary wallet (embedded) is not the owner
        isOwner: vi.fn().mockResolvedValue(false),
        isAdmin: vi.fn().mockResolvedValue(false),
      };

      setupMocks({
        authenticated: true,
        isConnected: true,
        address: "0x1234567890abcdef1234567890abcdef12345678", // embedded wallet (primary)
        user: mockUser,
        project: mockProject,
        projectInstance: mockProjectInstance,
        rpcUrl: "https://mainnet.optimism.io",
        // compareAllWallets returns true because 0xAAAA... is in linkedAccounts
        compareAllWalletsResult: true,
      });

      const { result } = renderHook(() => useProjectPermissions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isProjectOwner).toBe(true);
      });

      // Verify compareAllWallets was called with the user and project owner
      expect(mockCompareAllWallets).toHaveBeenCalledWith(mockUser, mockProject.owner);
    });

    it("should_not_recognize_owner_when_no_linked_wallet_matches_project_owner", async () => {
      const mockProjectInstance = {
        chainID: 10,
        isOwner: vi.fn().mockResolvedValue(false),
        isAdmin: vi.fn().mockResolvedValue(false),
      };

      setupMocks({
        authenticated: true,
        isConnected: true,
        address: "0x1234567890abcdef1234567890abcdef12345678",
        user: mockUser,
        project: mockProject,
        projectInstance: mockProjectInstance,
        rpcUrl: "https://mainnet.optimism.io",
        compareAllWalletsResult: false,
      });

      const { result } = renderHook(() => useProjectPermissions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isProjectOwner).toBe(false);
    });

    it("should_recognize_owner_when_on_chain_check_fails_but_api_owner_matches", async () => {
      const mockProjectInstance = {
        chainID: 10,
        // On-chain check throws (RPC error, network issue, etc.)
        isOwner: vi.fn().mockRejectedValue(new Error("RPC call failed")),
        isAdmin: vi.fn().mockRejectedValue(new Error("RPC call failed")),
      };

      setupMocks({
        authenticated: true,
        isConnected: true,
        address: "0x1234567890abcdef1234567890abcdef12345678",
        user: mockUser,
        project: mockProject,
        projectInstance: mockProjectInstance,
        rpcUrl: "https://mainnet.optimism.io",
        compareAllWalletsResult: true,
      });

      const { result } = renderHook(() => useProjectPermissions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isProjectOwner).toBe(true);
      });

      expect(result.current.isProjectAdmin).toBe(false);
    });
  });

  describe("multi-wallet admin", () => {
    const ADMIN_WALLET = "0x741e2cdff080bd42cd30cfd6cc4a8a0f46a80a84";
    const ACTIVE_WALLET = "0xbec2de31b27f04ea906c139b1c665bcdfd81a1aa";

    const mockProject = {
      uid: "test-project-uid",
      details: { slug: "test-slug" },
      chainID: 10,
      // Project owner is someone else entirely — this account is only an admin.
      owner: "0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
    };

    // One Privy account, two embedded wallets. The admin authority sits on
    // ADMIN_WALLET, but Privy currently surfaces ACTIVE_WALLET as the active one.
    const mockUser = {
      linkedAccounts: [
        { type: "wallet", address: ACTIVE_WALLET, walletClientType: "privy" },
        { type: "wallet", address: ADMIN_WALLET, walletClientType: "privy" },
      ],
    };

    it("recognizes admin when the role sits on a non-active linked wallet", async () => {
      const mockProjectInstance = {
        chainID: 10,
        isOwner: vi.fn().mockResolvedValue(false),
        // Only the admin wallet returns true on-chain; the active wallet does not.
        isAdmin: vi.fn((_provider: unknown, addr: string) =>
          Promise.resolve(addr.toLowerCase() === ADMIN_WALLET.toLowerCase())
        ),
      };

      setupMocks({
        authenticated: true,
        isConnected: true,
        address: ACTIVE_WALLET, // the wrong wallet is active
        user: mockUser,
        project: mockProject,
        projectInstance: mockProjectInstance,
        rpcUrl: "https://mainnet.optimism.io",
        linkedWalletAddresses: [ACTIVE_WALLET, ADMIN_WALLET],
      });

      const { result } = renderHook(() => useProjectPermissions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isProjectAdmin).toBe(true);
      });

      // isAdmin must have been checked against the non-active admin wallet.
      expect(mockProjectInstance.isAdmin).toHaveBeenCalledWith(expect.anything(), ADMIN_WALLET);
      expect(result.current.isProjectOwner).toBe(false);
    });

    it("denies admin when no linked wallet holds the role on-chain", async () => {
      const mockProjectInstance = {
        chainID: 10,
        isOwner: vi.fn().mockResolvedValue(false),
        isAdmin: vi.fn().mockResolvedValue(false),
      };

      setupMocks({
        authenticated: true,
        isConnected: true,
        address: ACTIVE_WALLET,
        user: mockUser,
        project: mockProject,
        projectInstance: mockProjectInstance,
        rpcUrl: "https://mainnet.optimism.io",
        linkedWalletAddresses: [ACTIVE_WALLET, ADMIN_WALLET],
      });

      const { result } = renderHook(() => useProjectPermissions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isProjectAdmin).toBe(false);
      expect(result.current.isProjectOwner).toBe(false);
    });
  });
});
