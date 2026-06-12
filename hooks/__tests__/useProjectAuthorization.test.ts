import { renderHook } from "@testing-library/react";
import { useProjectAuthorization } from "../useProjectAuthorization";

vi.mock("@/store", () => ({
  useOwnerStore: vi.fn(),
  useProjectStore: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useProjectPermissions", () => ({
  useProjectPermissions: vi.fn(),
}));

vi.mock("@/hooks/communities/useIsCommunityAdmin", () => ({
  useIsCommunityAdmin: vi.fn(),
}));

import { useIsCommunityAdmin } from "@/hooks/communities/useIsCommunityAdmin";
import { useAuth } from "@/hooks/useAuth";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { useOwnerStore, useProjectStore } from "@/store";

const mockUseOwnerStore = useOwnerStore as unknown as vi.Mock;
const mockUseProjectStore = useProjectStore as unknown as vi.Mock;
const mockUseAuth = useAuth as unknown as vi.Mock;
const mockUseProjectPermissions = useProjectPermissions as unknown as vi.Mock;
const mockUseIsCommunityAdmin = useIsCommunityAdmin as unknown as vi.Mock;

function setup({
  ready = true,
  authenticated = true,
  isOwner = false,
  isOwnerLoading = false,
  isProjectAdmin = false,
  isProjectOwner = false,
  permissions = { isProjectOwner: false, isProjectAdmin: false, isResolving: false },
  community = { isCommunityAdmin: false, isResolving: false },
} = {}) {
  mockUseAuth.mockReturnValue({ ready, authenticated });
  mockUseOwnerStore.mockImplementation((selector) => selector({ isOwner, isOwnerLoading }));
  mockUseProjectStore.mockImplementation((selector) =>
    selector({ isProjectAdmin, isProjectOwner })
  );
  mockUseProjectPermissions.mockReturnValue(permissions);
  mockUseIsCommunityAdmin.mockReturnValue(community);
}

describe("useProjectAuthorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loading / unready states", () => {
    it("is loading while Privy is not ready", () => {
      setup({ ready: false });
      const { result } = renderHook(() => useProjectAuthorization());
      expect(result.current).toEqual({ isAuthorized: false, isLoading: true });
    });

    it("resolves synchronously to denied for guests (no skeleton)", () => {
      setup({ ready: true, authenticated: false, isOwnerLoading: true });
      const { result } = renderHook(() => useProjectAuthorization());
      // Even though the owner store still reports loading, an unauthenticated
      // user is resolved-denied immediately — guests must see public UI.
      expect(result.current).toEqual({ isAuthorized: false, isLoading: false });
    });
  });

  describe("any-grant-wins", () => {
    it("authorizes a contract owner immediately", () => {
      setup({ isOwner: true });
      const { result } = renderHook(() => useProjectAuthorization());
      expect(result.current).toEqual({ isAuthorized: true, isLoading: false });
    });

    it("authorizes an on-chain project admin (store flag)", () => {
      setup({ isProjectAdmin: true });
      const { result } = renderHook(() => useProjectAuthorization());
      expect(result.current.isAuthorized).toBe(true);
    });

    it("authorizes a project owner via the permissions hook", () => {
      setup({
        permissions: { isProjectOwner: true, isProjectAdmin: false, isResolving: false },
      });
      const { result } = renderHook(() => useProjectAuthorization());
      expect(result.current.isAuthorized).toBe(true);
    });

    it("authorizes a community admin (grant-scoped)", () => {
      setup({ community: { isCommunityAdmin: true, isResolving: false } });
      const { result } = renderHook(() => useProjectAuthorization("0xCommunity"));
      expect(result.current.isAuthorized).toBe(true);
    });

    it("never shows a skeleton once any signal has granted access", () => {
      // Owner store resolved-true while the permissions check is still resolving:
      // a resolved grant must win and suppress the skeleton.
      setup({
        isOwner: true,
        isOwnerLoading: false,
        permissions: { isProjectOwner: false, isProjectAdmin: false, isResolving: true },
      });
      const { result } = renderHook(() => useProjectAuthorization());
      expect(result.current).toEqual({ isAuthorized: true, isLoading: false });
    });
  });

  describe("undecided authenticated users", () => {
    it("is loading while the owner check is still resolving", () => {
      setup({ isOwnerLoading: true });
      const { result } = renderHook(() => useProjectAuthorization());
      expect(result.current).toEqual({ isAuthorized: false, isLoading: true });
    });

    it("is loading while the permissions query is still pending (disabled-query window)", () => {
      // The exact #1185 window: owner store resolved false, but the permissions
      // chain (project instance fetch / disabled query) is still pending.
      setup({
        isOwnerLoading: false,
        permissions: { isProjectOwner: false, isProjectAdmin: false, isResolving: true },
      });
      const { result } = renderHook(() => useProjectAuthorization());
      expect(result.current).toEqual({ isAuthorized: false, isLoading: true });
    });

    it("is loading while the community-admin check is still resolving", () => {
      setup({ community: { isCommunityAdmin: false, isResolving: true } });
      const { result } = renderHook(() => useProjectAuthorization("0xCommunity"));
      expect(result.current).toEqual({ isAuthorized: false, isLoading: true });
    });
  });

  describe("resolved-denied", () => {
    it("is resolved-denied when every signal has settled false", () => {
      setup();
      const { result } = renderHook(() => useProjectAuthorization());
      expect(result.current).toEqual({ isAuthorized: false, isLoading: false });
    });
  });
});
