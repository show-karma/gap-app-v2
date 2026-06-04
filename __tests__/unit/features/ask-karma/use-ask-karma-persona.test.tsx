import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useAskKarmaPersona } from "@/src/features/ask-karma/hooks/use-ask-karma-persona";

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/usePermissions", () => ({ usePermissions: vi.fn() }));

const mockUseAuth = useAuth as unknown as ReturnType<typeof vi.fn>;
const mockUsePermissions = usePermissions as unknown as ReturnType<typeof vi.fn>;

function setup({ authenticated, isReviewer }: { authenticated: boolean; isReviewer: boolean }) {
  mockUseAuth.mockReturnValue({ authenticated });
  mockUsePermissions.mockReturnValue({ hasRole: isReviewer });
}

describe("useAskKarmaPersona", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 'visitor' when the user is signed out", () => {
    setup({ authenticated: false, isReviewer: false });
    const { result } = renderHook(() => useAskKarmaPersona());
    expect(result.current).toBe("visitor");
  });

  it("returns 'reviewer' when a signed-in user reviews any program", () => {
    setup({ authenticated: true, isReviewer: true });
    const { result } = renderHook(() => useAskKarmaPersona());
    expect(result.current).toBe("reviewer");
  });

  it("returns 'grantee' for a signed-in user who is not a reviewer", () => {
    setup({ authenticated: true, isReviewer: false });
    const { result } = renderHook(() => useAskKarmaPersona());
    expect(result.current).toBe("grantee");
  });

  it("ignores reviewer status while signed out", () => {
    // The permission query is disabled when signed out; even if it leaked a
    // stale `true`, a signed-out visitor must stay on the visitor prompts.
    setup({ authenticated: false, isReviewer: true });
    const { result } = renderHook(() => useAskKarmaPersona());
    expect(result.current).toBe("visitor");
  });
});
