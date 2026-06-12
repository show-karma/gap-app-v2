/**
 * HEAVY SMOKE / HTTP-INTEGRATION tests for the backend-resolved permission flow.
 *
 * Unlike the unit tests (which mock the hook or the service), these drive the
 * FULL chain for real against a mocked indexer:
 *
 *   useProjectAccess / useGrantMilestoneAccess / useScopedCommunityAdmin
 *     -> usePermissionsQuery (React Query)
 *       -> authorizationService.getPermissions
 *         -> fetchData -> GET /v2/auth/permissions  (intercepted by MSW)
 *           -> DTO validation/parse
 *             -> derived UI-gating booleans
 *
 * This locks the regression-critical behaviors of PR #1580:
 *  - the persona -> permission -> UI-gate mapping,
 *  - community-admin scoping (admin of community A cannot act on community B),
 *  - fail-closed on loading / error / unauthenticated,
 *  - correct request params reaching the endpoint,
 *  - DTO hardening (garbage roles/permissions are dropped).
 */

import { waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import {
  useGrantMilestoneAccess,
  useProjectAccess,
  useScopedCommunityAdmin,
} from "@/src/core/rbac/hooks/use-resource-access";
import { Permission } from "@/src/core/rbac/types";
import { Role } from "@/src/core/rbac/types/role";
import { installMswLifecycle, server } from "../../msw/server";
import { renderHookWithProviders } from "../../utils/render";

// Stub the indexer token so fetchData's auth path doesn't touch Privy in jsdom.
vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getToken: vi.fn().mockResolvedValue("test-token") },
}));

// The three hooks read only `isAuthenticated` from useAuth — drive it directly
// (toggled per test for the unauthenticated case).
let mockIsAuthenticated = true;
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated }),
}));

installMswLifecycle();

type PermissionsDTO = {
  roles: { primaryRole: string; roles: string[]; reviewerTypes?: string[] };
  permissions: string[];
  resourceContext: Record<string, string | undefined>;
  isCommunityAdmin: boolean;
  isProgramAdmin: boolean;
  isReviewer: boolean;
  isRegistryAdmin: boolean;
  isProgramCreator: boolean;
  isProjectOwner: boolean;
  isProjectAdmin: boolean;
};

function permissionsDTO(overrides: Partial<PermissionsDTO> = {}): PermissionsDTO {
  return {
    roles: { primaryRole: Role.GUEST, roles: [Role.GUEST], reviewerTypes: [] },
    permissions: [],
    resourceContext: {},
    isCommunityAdmin: false,
    isProgramAdmin: false,
    isReviewer: false,
    isRegistryAdmin: false,
    isProgramCreator: false,
    isProjectOwner: false,
    isProjectAdmin: false,
    ...overrides,
  };
}

/** Register a /v2/auth/permissions responder. */
function respondPermissions(
  resolver: (params: URLSearchParams) => PermissionsDTO | { status: number }
) {
  server.use(
    http.get("*/v2/auth/permissions", ({ request }) => {
      const params = new URL(request.url).searchParams;
      const result = resolver(params);
      if ("status" in result) {
        return HttpResponse.json({ message: "error" }, { status: result.status });
      }
      return HttpResponse.json(result);
    })
  );
}

beforeEach(() => {
  mockIsAuthenticated = true;
  vi.clearAllMocks();
});

describe("Permissions flow — useProjectAccess persona matrix (HTTP)", () => {
  const OWNER_DTO = permissionsDTO({
    roles: { primaryRole: Role.APPLICANT, roles: [Role.APPLICANT], reviewerTypes: [] },
    permissions: [
      Permission.PROJECT_VIEW,
      Permission.PROJECT_EDIT,
      Permission.PROJECT_MANAGE_LINKS,
      Permission.PROJECT_MANAGE_MEMBERS,
    ],
    isProjectOwner: true,
  });

  it("grants edit/links/members to a project owner", async () => {
    respondPermissions(() => OWNER_DTO);

    const { result } = renderHookWithProviders(() => useProjectAccess("proj-1", 10));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.canEdit).toBe(true);
    expect(result.current.canManageLinks).toBe(true);
    expect(result.current.canManageMembers).toBe(true);
    expect(result.current.isError).toBe(false);
  });

  it("grants edit but NOT manage to an on-chain admin (no community/owner)", async () => {
    respondPermissions(() =>
      permissionsDTO({
        permissions: [Permission.PROJECT_VIEW, Permission.PROJECT_EDIT],
        isProjectAdmin: true,
      })
    );

    const { result } = renderHookWithProviders(() => useProjectAccess("proj-1", 10));

    await waitFor(() => expect(result.current.canEdit).toBe(true));
    expect(result.current.canManageLinks).toBe(false);
    expect(result.current.canManageMembers).toBe(false);
  });

  it("grants manage-links but NOT edit to a community admin", async () => {
    respondPermissions(() =>
      permissionsDTO({
        roles: {
          primaryRole: Role.COMMUNITY_ADMIN,
          roles: [Role.COMMUNITY_ADMIN],
          reviewerTypes: [],
        },
        permissions: [Permission.PROJECT_VIEW, Permission.PROJECT_MANAGE_LINKS],
        isCommunityAdmin: true,
      })
    );

    const { result } = renderHookWithProviders(() => useProjectAccess("proj-1", 10));

    await waitFor(() => expect(result.current.canManageLinks).toBe(true));
    expect(result.current.canEdit).toBe(false);
    expect(result.current.canManageMembers).toBe(false);
  });

  it("grants only view (no actions) to a plain member", async () => {
    respondPermissions(() => permissionsDTO({ permissions: [Permission.PROJECT_VIEW] }));

    const { result } = renderHookWithProviders(() => useProjectAccess("proj-1", 10));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.canEdit).toBe(false);
    expect(result.current.canManageLinks).toBe(false);
    expect(result.current.canManageMembers).toBe(false);
  });

  it("grants everything to staff (wildcard permission set)", async () => {
    respondPermissions(() =>
      permissionsDTO({
        roles: { primaryRole: Role.SUPER_ADMIN, roles: [Role.SUPER_ADMIN], reviewerTypes: [] },
        permissions: [
          Permission.PROJECT_VIEW,
          Permission.PROJECT_EDIT,
          Permission.PROJECT_MANAGE_LINKS,
          Permission.PROJECT_MANAGE_MEMBERS,
        ],
      })
    );

    const { result } = renderHookWithProviders(() => useProjectAccess("proj-1", 10));

    await waitFor(() => expect(result.current.canEdit).toBe(true));
    expect(result.current.canManageLinks).toBe(true);
    expect(result.current.canManageMembers).toBe(true);
  });

  it("sends projectId + chainId to the endpoint", async () => {
    let captured: URLSearchParams | null = null;
    respondPermissions((params) => {
      captured = params;
      return OWNER_DTO;
    });

    const { result } = renderHookWithProviders(() => useProjectAccess("proj-xyz", 42));

    await waitFor(() => expect(result.current.canEdit).toBe(true));
    expect(captured!.get("projectId")).toBe("proj-xyz");
    expect(captured!.get("chainId")).toBe("42");
  });
});

describe("Permissions flow — fail-closed behavior", () => {
  it("does NOT call the endpoint and denies when unauthenticated", async () => {
    mockIsAuthenticated = false;
    let called = false;
    respondPermissions(() => {
      called = true;
      return permissionsDTO();
    });

    const { result } = renderHookWithProviders(() => useProjectAccess("proj-1", 10));

    // Give any (unwanted) request a tick to fire.
    await new Promise((r) => setTimeout(r, 50));
    expect(called).toBe(false);
    expect(result.current.canEdit).toBe(false);
    expect(result.current.canManageLinks).toBe(false);
    expect(result.current.canManageMembers).toBe(false);
  });

  it("denies (fail-closed) and flags error when the endpoint 500s", async () => {
    respondPermissions(() => ({ status: 500 }));

    const { result } = renderHookWithProviders(() => useProjectAccess("proj-1", 10));

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
    expect(result.current.canEdit).toBe(false);
    expect(result.current.canManageLinks).toBe(false);
    expect(result.current.canManageMembers).toBe(false);
  });

  it("denies while the request is still loading", async () => {
    respondPermissions(() =>
      permissionsDTO({ permissions: [Permission.PROJECT_EDIT], isProjectOwner: true })
    );

    const { result } = renderHookWithProviders(() => useProjectAccess("proj-1", 10));

    // First render, before the response resolves.
    expect(result.current.isLoading).toBe(true);
    expect(result.current.canEdit).toBe(false);
  });
});

describe("Permissions flow — useGrantMilestoneAccess (HTTP)", () => {
  it("grants edit + complete when MILESTONE_EDIT is present", async () => {
    respondPermissions(() => permissionsDTO({ permissions: [Permission.MILESTONE_EDIT] }));

    const { result } = renderHookWithProviders(() => useGrantMilestoneAccess("ms-1", 10));

    await waitFor(() => expect(result.current.canEdit).toBe(true));
    expect(result.current.canComplete).toBe(true);
  });

  it("denies edit + complete when MILESTONE_EDIT is absent", async () => {
    respondPermissions(() => permissionsDTO({ permissions: [Permission.PROJECT_VIEW] }));

    const { result } = renderHookWithProviders(() => useGrantMilestoneAccess("ms-1", 10));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.canEdit).toBe(false);
    expect(result.current.canComplete).toBe(false);
  });

  it("stays disabled (no request) when chainId is undefined", async () => {
    let called = false;
    respondPermissions(() => {
      called = true;
      return permissionsDTO({ permissions: [Permission.MILESTONE_EDIT] });
    });

    const { result } = renderHookWithProviders(() => useGrantMilestoneAccess("ms-1", undefined));

    await new Promise((r) => setTimeout(r, 50));
    expect(called).toBe(false);
    expect(result.current.canComplete).toBe(false);
  });

  it("sends milestoneId + chainId to the endpoint", async () => {
    let captured: URLSearchParams | null = null;
    respondPermissions((params) => {
      captured = params;
      return permissionsDTO({ permissions: [Permission.MILESTONE_EDIT] });
    });

    const { result } = renderHookWithProviders(() => useGrantMilestoneAccess("ms-abc", 8453));

    await waitFor(() => expect(result.current.canComplete).toBe(true));
    expect(captured!.get("milestoneId")).toBe("ms-abc");
    expect(captured!.get("chainId")).toBe("8453");
  });
});

describe("Permissions flow — community-admin scoping regression (HTTP)", () => {
  // The bug PR #1580 fixed: a global isCommunityAdmin let an admin of community A
  // act on resources in community B. The backend now scopes per queried community.
  function adminOnlyOfCommunityA() {
    respondPermissions((params) => {
      const communityId = params.get("communityId");
      const isAdmin = communityId === "comm-A";
      return permissionsDTO({
        roles: isAdmin
          ? { primaryRole: Role.COMMUNITY_ADMIN, roles: [Role.COMMUNITY_ADMIN], reviewerTypes: [] }
          : { primaryRole: Role.GUEST, roles: [Role.GUEST], reviewerTypes: [] },
        isCommunityAdmin: isAdmin,
      });
    });
  }

  it("reports admin for the community the user actually administers", async () => {
    adminOnlyOfCommunityA();

    const { result } = renderHookWithProviders(() => useScopedCommunityAdmin("comm-A", 10));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isCommunityAdmin).toBe(true);
  });

  it("does NOT report admin for a different community (A-admin querying B)", async () => {
    adminOnlyOfCommunityA();

    const { result } = renderHookWithProviders(() => useScopedCommunityAdmin("comm-B", 10));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isCommunityAdmin).toBe(false);
  });

  it("sends communityId + chainId to the endpoint", async () => {
    let captured: URLSearchParams | null = null;
    respondPermissions((params) => {
      captured = params;
      return permissionsDTO({ isCommunityAdmin: true });
    });

    const { result } = renderHookWithProviders(() => useScopedCommunityAdmin("comm-A", 137));

    await waitFor(() => expect(result.current.isCommunityAdmin).toBe(true));
    expect(captured!.get("communityId")).toBe("comm-A");
    expect(captured!.get("chainId")).toBe("137");
  });
});

describe("Permissions flow — DTO hardening (HTTP)", () => {
  it("drops unknown permission/role strings and denies actions", async () => {
    respondPermissions(() =>
      permissionsDTO({
        roles: {
          primaryRole: "WAT_ROLE" as Role,
          roles: ["WAT_ROLE" as Role, Role.GUEST],
          reviewerTypes: [],
        },
        // a bogus permission string must not unlock edit
        permissions: ["project:make_me_admin" as Permission],
      })
    );

    const { result } = renderHookWithProviders(() => useProjectAccess("proj-1", 10));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.canEdit).toBe(false);
    expect(result.current.canManageLinks).toBe(false);
    expect(result.current.canManageMembers).toBe(false);
  });
});
