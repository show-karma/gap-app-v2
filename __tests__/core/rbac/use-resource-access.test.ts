import { renderHook } from "@testing-library/react";
import {
  useGrantMilestoneAccess,
  useGrantMilestoneVerifyAccess,
  useProjectAccess,
  useScopedCommunityAdmin,
} from "@/src/core/rbac/hooks/use-resource-access";
import { Permission, ReviewerType, Role } from "@/src/core/rbac/types";

const mockUsePermissionsQuery = vi.fn();

vi.mock("@/src/core/rbac/hooks/use-permissions", () => ({
  usePermissionsQuery: (params: Record<string, unknown>, options: Record<string, unknown>) =>
    mockUsePermissionsQuery(params, options),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

const projectFlags = { isProjectOwner: false, isProjectAdmin: false };

vi.mock("@/store", () => ({
  useProjectStore: (selector: (state: typeof projectFlags) => unknown) => selector(projectFlags),
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

describe("useGrantMilestoneVerifyAccess", () => {
  const params = { communityUID: "comm-1", programId: "959_42161", chainId: 42161 };
  const roles = (overrides: { roles?: Role[]; reviewerTypes?: ReviewerType[] } = {}) => ({
    roles: { primaryRole: Role.GUEST, roles: [], reviewerTypes: [], ...overrides },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    projectFlags.isProjectOwner = false;
    projectFlags.isProjectAdmin = false;
    mockUsePermissionsQuery.mockReturnValue(queryResult([], roles()));
  });

  it("strips the chain suffix from the program id before querying", () => {
    renderHook(() => useGrantMilestoneVerifyAccess(params));

    expect(mockUsePermissionsQuery).toHaveBeenCalledWith(
      { communityId: "comm-1", programId: "959", chainId: 42161 },
      { enabled: true }
    );
  });

  it("denies users with no review authority", () => {
    const { result } = renderHook(() => useGrantMilestoneVerifyAccess(params));

    expect(result.current.canVerify).toBe(false);
  });

  it("grants community admins", () => {
    mockUsePermissionsQuery.mockReturnValue(
      queryResult([], { isCommunityAdmin: true, ...roles() })
    );

    const { result } = renderHook(() => useGrantMilestoneVerifyAccess(params));

    expect(result.current.canVerify).toBe(true);
    expect(result.current.isMilestoneReviewer).toBe(false);
  });

  it("grants milestone reviewers but not program-only reviewers", () => {
    mockUsePermissionsQuery.mockReturnValue(
      queryResult([], roles({ reviewerTypes: [ReviewerType.PROGRAM] }))
    );
    const { result: programOnly } = renderHook(() => useGrantMilestoneVerifyAccess(params));
    expect(programOnly.current.canVerify).toBe(false);

    mockUsePermissionsQuery.mockReturnValue(
      queryResult([], roles({ reviewerTypes: [ReviewerType.MILESTONE] }))
    );
    const { result } = renderHook(() => useGrantMilestoneVerifyAccess(params));
    expect(result.current.canVerify).toBe(true);
    expect(result.current.isMilestoneReviewer).toBe(true);
  });

  it("grants staff", () => {
    mockUsePermissionsQuery.mockReturnValue(queryResult([], roles({ roles: [Role.SUPER_ADMIN] })));

    const { result } = renderHook(() => useGrantMilestoneVerifyAccess(params));

    expect(result.current.canVerify).toBe(true);
  });

  it("never lets project owners or admins verify their own milestones", () => {
    mockUsePermissionsQuery.mockReturnValue(
      queryResult([], { isCommunityAdmin: true, ...roles() })
    );

    projectFlags.isProjectOwner = true;
    const { result: owner } = renderHook(() => useGrantMilestoneVerifyAccess(params));
    expect(owner.current.canVerify).toBe(false);

    projectFlags.isProjectOwner = false;
    projectFlags.isProjectAdmin = true;
    const { result: admin } = renderHook(() => useGrantMilestoneVerifyAccess(params));
    expect(admin.current.canVerify).toBe(false);
  });

  it("denies while showing placeholder data from a previous context", () => {
    mockUsePermissionsQuery.mockReturnValue({
      ...queryResult([], { isCommunityAdmin: true, ...roles() }),
      isPlaceholderData: true,
    });

    const { result } = renderHook(() => useGrantMilestoneVerifyAccess(params));

    expect(result.current.canVerify).toBe(false);
  });
});
