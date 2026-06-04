import { renderHook, waitFor } from "@testing-library/react";
import { useAuth } from "@/hooks/useAuth";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { usePermissionsQuery } from "@/src/core/rbac/hooks/use-permissions";
import { useProjectStore } from "@/store";

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/store", () => ({ useProjectStore: vi.fn() }));
vi.mock("@/src/core/rbac/hooks/use-permissions", () => ({
  usePermissionsQuery: vi.fn(),
}));

const mockUseAuth = useAuth as unknown as vi.Mock;
const mockUseProjectStore = useProjectStore as unknown as vi.Mock;
const mockUsePermissionsQuery = usePermissionsQuery as unknown as vi.Mock;
const mockSetIsProjectAdmin = vi.fn();
const mockSetIsProjectOwner = vi.fn();

function setup(opts: {
  authenticated?: boolean;
  project?: unknown;
  data?: { isProjectOwner?: boolean; isProjectAdmin?: boolean };
  isLoading?: boolean;
}) {
  const { authenticated = false, project = null, data, isLoading = false } = opts;
  mockUseAuth.mockReturnValue({ authenticated });
  mockUseProjectStore.mockImplementation((selector: (s: any) => any) =>
    selector({
      project,
      setIsProjectAdmin: mockSetIsProjectAdmin,
      setIsProjectOwner: mockSetIsProjectOwner,
    })
  );
  mockUsePermissionsQuery.mockReturnValue({
    data,
    isLoading,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  });
}

const PROJECT = { uid: "test-uid", details: { slug: "test-slug" }, chainID: 10 };

describe("useProjectPermissions (backend-resolved)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns false for both when unauthenticated and disables the query", () => {
    setup({ authenticated: false, project: PROJECT, data: { isProjectOwner: true } });

    const { result } = renderHook(() => useProjectPermissions());

    expect(result.current.isProjectOwner).toBe(false);
    expect(result.current.isProjectAdmin).toBe(false);
    expect(mockUsePermissionsQuery).toHaveBeenCalledWith(
      { projectId: "test-slug", chainId: 10 },
      { enabled: false }
    );
  });

  it("derives owner/admin from the backend permissions response", () => {
    setup({
      authenticated: true,
      project: PROJECT,
      data: { isProjectOwner: true, isProjectAdmin: false },
    });

    const { result } = renderHook(() => useProjectPermissions());

    expect(result.current.isProjectOwner).toBe(true);
    expect(result.current.isProjectAdmin).toBe(false);
    expect(mockUsePermissionsQuery).toHaveBeenCalledWith(
      { projectId: "test-slug", chainId: 10 },
      { enabled: true }
    );
  });

  it("recognizes admin from the backend (multi-wallet resolved server-side)", () => {
    setup({
      authenticated: true,
      project: PROJECT,
      data: { isProjectOwner: false, isProjectAdmin: true },
    });

    const { result } = renderHook(() => useProjectPermissions());

    expect(result.current.isProjectAdmin).toBe(true);
    expect(result.current.isProjectOwner).toBe(false);
  });

  it("syncs the project store with resolved flags", async () => {
    setup({
      authenticated: true,
      project: PROJECT,
      data: { isProjectOwner: true, isProjectAdmin: true },
    });

    renderHook(() => useProjectPermissions());

    await waitFor(() => {
      expect(mockSetIsProjectOwner).toHaveBeenCalledWith(true);
      expect(mockSetIsProjectAdmin).toHaveBeenCalledWith(true);
    });
  });

  it("resets the store to false when unauthenticated", async () => {
    setup({ authenticated: false, project: PROJECT });

    renderHook(() => useProjectPermissions());

    await waitFor(() => {
      expect(mockSetIsProjectOwner).toHaveBeenCalledWith(false);
      expect(mockSetIsProjectAdmin).toHaveBeenCalledWith(false);
    });
  });
});
