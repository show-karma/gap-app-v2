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

interface SetupOptions {
  authenticated: boolean;
  reviewerPrograms?: Array<{ communitySlug?: string; communityUID?: string }>;
  isCommunityAdmin?: boolean;
}

function setup({ authenticated, reviewerPrograms = [], isCommunityAdmin = false }: SetupOptions) {
  mockUseAuth.mockReturnValue({ authenticated, address: authenticated ? "0xabc" : undefined });
  mockUsePermissions.mockReturnValue({ programs: reviewerPrograms });
  mockUseIsCommunityAdmin.mockReturnValue({ isCommunityAdmin });
}

describe("useAskKarmaPersona", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 'visitor' when the user is signed out", () => {
    setup({ authenticated: false });
    const { result } = renderHook(() => useAskKarmaPersona("filecoin"));
    expect(result.current).toBe("visitor");
  });

  it("returns 'reviewer' when the user reviews a program in the page's community", () => {
    setup({ authenticated: true, reviewerPrograms: [{ communitySlug: "filecoin" }] });
    const { result } = renderHook(() => useAskKarmaPersona("filecoin"));
    expect(result.current).toBe("reviewer");
  });

  it("matches the reviewer program by community UID as well as slug", () => {
    setup({ authenticated: true, reviewerPrograms: [{ communityUID: "0xCommunityUID" }] });
    const { result } = renderHook(() => useAskKarmaPersona("0xcommunityuid"));
    expect(result.current).toBe("reviewer");
  });

  it("ignores reviewer programs from a different community", () => {
    setup({ authenticated: true, reviewerPrograms: [{ communitySlug: "optimism" }] });
    const { result } = renderHook(() => useAskKarmaPersona("filecoin"));
    expect(result.current).toBe("grantee");
  });

  it("returns 'reviewer' when the user administers the page's community", () => {
    setup({ authenticated: true, isCommunityAdmin: true });
    const { result } = renderHook(() => useAskKarmaPersona("filecoin"));
    expect(result.current).toBe("reviewer");
  });

  it("scopes the admin check to the page's community", () => {
    setup({ authenticated: true, isCommunityAdmin: true });
    renderHook(() => useAskKarmaPersona("filecoin"));
    expect(mockUseIsCommunityAdmin).toHaveBeenCalledWith(
      "filecoin",
      undefined,
      expect.objectContaining({ enabled: true })
    );
  });

  it("returns 'grantee' for a signed-in user with no role in the page's community", () => {
    setup({ authenticated: true });
    const { result } = renderHook(() => useAskKarmaPersona("filecoin"));
    expect(result.current).toBe("grantee");
  });

  it("falls back to 'reviewer of any program' when no community is in scope", () => {
    setup({ authenticated: true, reviewerPrograms: [{ communitySlug: "optimism" }] });
    const { result } = renderHook(() => useAskKarmaPersona(undefined));
    expect(result.current).toBe("reviewer");
  });

  it("disables the admin check when there is no community in scope", () => {
    setup({ authenticated: true });
    renderHook(() => useAskKarmaPersona(undefined));
    expect(mockUseIsCommunityAdmin).toHaveBeenCalledWith(
      undefined,
      undefined,
      expect.objectContaining({ enabled: false })
    );
  });

  it("ignores reviewer status while signed out", () => {
    // The permission query is disabled when signed out; even if it leaked
    // stale programs, a signed-out visitor must stay on the visitor prompts.
    setup({ authenticated: false, reviewerPrograms: [{ communitySlug: "filecoin" }] });
    const { result } = renderHook(() => useAskKarmaPersona("filecoin"));
    expect(result.current).toBe("visitor");
  });
});
