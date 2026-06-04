import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useIsCommunityAdmin } from "@/hooks/communities/useIsCommunityAdmin";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useAskKarmaPersona } from "@/src/features/ask-karma/hooks/use-ask-karma-persona";

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/usePermissions", () => ({ usePermissions: vi.fn() }));
vi.mock("@/hooks/communities/useIsCommunityAdmin", () => ({ useIsCommunityAdmin: vi.fn() }));

const mockUseAuth = useAuth as unknown as ReturnType<typeof vi.fn>;
const mockUsePermissions = usePermissions as unknown as ReturnType<typeof vi.fn>;
const mockUseIsCommunityAdmin = useIsCommunityAdmin as unknown as ReturnType<typeof vi.fn>;

function setup({
  authenticated,
  isReviewer,
  isCommunityAdmin = false,
}: {
  authenticated: boolean;
  isReviewer: boolean;
  isCommunityAdmin?: boolean;
}) {
  mockUseAuth.mockReturnValue({ authenticated, address: authenticated ? "0xabc" : undefined });
  mockUsePermissions.mockReturnValue({ hasRole: isReviewer });
  mockUseIsCommunityAdmin.mockReturnValue({ isCommunityAdmin });
}

describe("useAskKarmaPersona", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 'visitor' when the user is signed out", () => {
    setup({ authenticated: false, isReviewer: false });
    const { result } = renderHook(() => useAskKarmaPersona("filecoin"));
    expect(result.current).toBe("visitor");
  });

  it("returns 'reviewer' when a signed-in user reviews any program", () => {
    setup({ authenticated: true, isReviewer: true });
    const { result } = renderHook(() => useAskKarmaPersona("filecoin"));
    expect(result.current).toBe("reviewer");
  });

  it("returns 'reviewer' when a signed-in user administers the page's community", () => {
    setup({ authenticated: true, isReviewer: false, isCommunityAdmin: true });
    const { result } = renderHook(() => useAskKarmaPersona("filecoin"));
    expect(result.current).toBe("reviewer");
  });

  it("scopes the admin check to the page's community", () => {
    setup({ authenticated: true, isReviewer: false, isCommunityAdmin: true });
    renderHook(() => useAskKarmaPersona("filecoin"));
    expect(mockUseIsCommunityAdmin).toHaveBeenCalledWith(
      "filecoin",
      undefined,
      expect.objectContaining({ enabled: true })
    );
  });

  it("returns 'grantee' for a signed-in user who is neither reviewer nor admin", () => {
    setup({ authenticated: true, isReviewer: false, isCommunityAdmin: false });
    const { result } = renderHook(() => useAskKarmaPersona("filecoin"));
    expect(result.current).toBe("grantee");
  });

  it("disables the admin check when there is no community in scope", () => {
    setup({ authenticated: true, isReviewer: false });
    renderHook(() => useAskKarmaPersona(undefined));
    expect(mockUseIsCommunityAdmin).toHaveBeenCalledWith(
      undefined,
      undefined,
      expect.objectContaining({ enabled: false })
    );
  });

  it("ignores reviewer status while signed out", () => {
    // The permission query is disabled when signed out; even if it leaked a
    // stale `true`, a signed-out visitor must stay on the visitor prompts.
    setup({ authenticated: false, isReviewer: true });
    const { result } = renderHook(() => useAskKarmaPersona("filecoin"));
    expect(result.current).toBe("visitor");
  });
});
