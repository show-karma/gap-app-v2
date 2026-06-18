import { renderHook } from "@testing-library/react";
import { useCanBypassClosedProgram } from "../use-can-bypass-closed-program";

const mocks = vi.hoisted(() => ({
  ctx: {
    isLoading: false,
    isCommunityAdmin: false,
    isReviewer: false,
  },
}));

vi.mock("@/src/core/rbac/context/permission-context", () => ({
  usePermissionContext: () => mocks.ctx,
}));

function setContext(overrides: Partial<typeof mocks.ctx>) {
  mocks.ctx = { isLoading: false, isCommunityAdmin: false, isReviewer: false, ...overrides };
}

describe("useCanBypassClosedProgram", () => {
  it("should_allow_bypass_when_user_is_community_admin", () => {
    setContext({ isCommunityAdmin: true });

    const { result } = renderHook(() => useCanBypassClosedProgram());

    expect(result.current.canBypass).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it("should_allow_bypass_when_user_is_reviewer", () => {
    setContext({ isReviewer: true });

    const { result } = renderHook(() => useCanBypassClosedProgram());

    expect(result.current.canBypass).toBe(true);
  });

  it("should_deny_bypass_when_user_has_no_admin_role", () => {
    setContext({});

    const { result } = renderHook(() => useCanBypassClosedProgram());

    expect(result.current.canBypass).toBe(false);
  });

  it("should_deny_bypass_while_permissions_are_loading_even_if_flags_are_set", () => {
    setContext({ isLoading: true, isCommunityAdmin: true });

    const { result } = renderHook(() => useCanBypassClosedProgram());

    expect(result.current.canBypass).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });
});
