import { renderHook } from "@testing-library/react";
import {
  useGrantMilestoneAccess,
  useProjectAccess,
  useScopedCommunityAdmin,
} from "@/src/core/rbac/hooks/use-resource-access";
import { Permission } from "@/src/core/rbac/types";

const mockUsePermissionsQuery = vi.fn();

vi.mock("@/src/core/rbac/hooks/use-permissions", () => ({
  usePermissionsQuery: (params: Record<string, unknown>, options: Record<string, unknown>) =>
    mockUsePermissionsQuery(params, options),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

const queryResult = (permissions: Permission[], extra: Record<string, unknown> = {}) => ({
  data: { permissions, isCommunityAdmin: false, ...extra },
  isLoading: false,
  isError: false,
});

describe("useProjectAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePermissionsQuery.mockReturnValue(queryResult([]));
  });

  it("derives action flags from backend permissions", () => {
    mockUsePermissionsQuery.mockReturnValue(
      queryResult([Permission.PROJECT_VIEW, Permission.PROJECT_EDIT])
    );

    const { result } = renderHook(() => useProjectAccess("0xproj", 10));

    expect(result.current.canEdit).toBe(true);
    expect(result.current.canManageLinks).toBe(false);
    expect(result.current.canManageMembers).toBe(false);
  });

  it("passes projectId + chainId and gates on projectId presence", () => {
    renderHook(() => useProjectAccess("0xproj", 10));

    expect(mockUsePermissionsQuery).toHaveBeenCalledWith(
      { projectId: "0xproj", chainId: 10 },
      { enabled: true }
    );
  });

  it("disables the query when no projectId", () => {
    renderHook(() => useProjectAccess(undefined, 10));

    expect(mockUsePermissionsQuery).toHaveBeenCalledWith(
      { projectId: undefined, chainId: 10 },
      { enabled: false }
    );
  });
});

describe("useGrantMilestoneAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePermissionsQuery.mockReturnValue(queryResult([]));
  });

  it("grants edit/complete when MILESTONE_EDIT is present", () => {
    mockUsePermissionsQuery.mockReturnValue(queryResult([Permission.MILESTONE_EDIT]));

    const { result } = renderHook(() => useGrantMilestoneAccess("0xms", 10));

    expect(result.current.canEdit).toBe(true);
    expect(result.current.canComplete).toBe(true);
  });

  it("requires both milestoneUID and chainId to enable", () => {
    renderHook(() => useGrantMilestoneAccess("0xms", undefined));

    expect(mockUsePermissionsQuery).toHaveBeenCalledWith(
      { milestoneId: "0xms", chainId: undefined },
      { enabled: false }
    );
  });
});

describe("useScopedCommunityAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePermissionsQuery.mockReturnValue(queryResult([]));
  });

  it("reads community-scoped isCommunityAdmin from the backend", () => {
    mockUsePermissionsQuery.mockReturnValue(queryResult([], { isCommunityAdmin: true }));

    const { result } = renderHook(() => useScopedCommunityAdmin("comm-1", 10));

    expect(result.current.isCommunityAdmin).toBe(true);
    expect(mockUsePermissionsQuery).toHaveBeenCalledWith(
      { communityId: "comm-1", chainId: 10 },
      { enabled: true }
    );
  });
});
