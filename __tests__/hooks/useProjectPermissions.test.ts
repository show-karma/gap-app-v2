import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { ethers } from "ethers";
import { createElement } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProjectInstance } from "@/hooks/useProjectInstance";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { useProjectStore } from "@/store";
import { getRPCUrlByChainId } from "@/utilities/rpcClient";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/store", () => ({
  useProjectStore: jest.fn(),
}));

jest.mock("@/hooks/useProjectInstance", () => ({
  useProjectInstance: jest.fn(),
}));

jest.mock("@/utilities/rpcClient", () => ({
  getRPCUrlByChainId: jest.fn(),
}));

jest.mock("@/components/Utilities/errorManager", () => ({
  errorManager: jest.fn(),
}));

jest.mock("ethers", () => {
  const MockJsonRpcProvider = jest.fn().mockReturnValue({});
  return {
    __esModule: true,
    ethers: { JsonRpcProvider: MockJsonRpcProvider },
    JsonRpcProvider: MockJsonRpcProvider,
  };
});

// Access the mock through the mocked module
const mockJsonRpcProvider = ethers.JsonRpcProvider as unknown as jest.Mock;

const mockUseAuth = useAuth as unknown as jest.Mock;
const mockUseProjectStore = useProjectStore as unknown as jest.Mock;
const mockUseProjectInstance = useProjectInstance as unknown as jest.Mock;
const mockGetRPCUrlByChainId = getRPCUrlByChainId as unknown as jest.Mock;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockSetIsProjectAdmin = jest.fn();
const mockSetIsProjectOwner = jest.fn();

function setupMocks(
  overrides: {
    authenticated?: boolean;
    isConnected?: boolean;
    address?: string | null;
    project?: any;
    projectInstance?: any;
    rpcUrl?: string | null;
  } = {}
) {
  const {
    authenticated = false,
    isConnected = false,
    address = null,
    project = null,
    projectInstance = null,
    rpcUrl = null,
  } = overrides;

  mockUseAuth.mockReturnValue({
    address,
    isConnected,
    authenticated,
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
}

describe("useProjectPermissions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    };

    const createMockProjectInstance = () => ({
      chainID: 1,
      isOwner: jest.fn().mockResolvedValue(true),
      isAdmin: jest.fn().mockResolvedValue(false),
    });

    it("checks permissions when authenticated with a project", async () => {
      const mockProjectInstance = createMockProjectInstance();
      setupMocks({
        authenticated: true,
        isConnected: true,
        address: "0x1234567890abcdef1234567890abcdef12345678",
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

    it("returns false when rpcUrl is not available", async () => {
      const mockProjectInstance = createMockProjectInstance();
      setupMocks({
        authenticated: true,
        isConnected: true,
        address: "0x1234567890abcdef1234567890abcdef12345678",
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
  });
});
