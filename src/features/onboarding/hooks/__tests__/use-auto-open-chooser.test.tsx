import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { markCompleted, readOnboardingRecord } from "../../lib/storage";
import {
  CHOOSER_SURFACE,
  useAutoOpenChooser,
  useChooserSuppression,
} from "../use-auto-open-chooser";

const open = vi.hoisted(() => vi.fn());
const scope = vi.hoisted(() => ({
  value: { scope: "did:privy:me", isReady: true, isAuthenticated: true },
}));
const whitelabel = vi.hoisted(() => ({ value: { isWhitelabel: false } }));

vi.mock("@/store/modals/gettingStarted", () => ({
  useGettingStarted: (selector?: (s: { open: () => void }) => unknown) => {
    const state = { open, close: vi.fn(), isOpen: false };
    return selector ? selector(state) : state;
  },
}));
vi.mock("@/utilities/whitelabel-context", () => ({ useWhitelabel: () => whitelabel.value }));
vi.mock("../use-onboarding-scope", () => ({ useOnboardingScope: () => scope.value }));

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
  scope.value = { scope: "did:privy:me", isReady: true, isAuthenticated: true };
  whitelabel.value = { isWhitelabel: false };
});

describe("opening on sign-in", () => {
  it("opens for a signed-in user who hasn't opted out", () => {
    renderHook(() => useAutoOpenChooser());

    expect(open).toHaveBeenCalledTimes(1);
  });

  it("opens once per session, not on every mount", () => {
    renderHook(() => useAutoOpenChooser());
    renderHook(() => useAutoOpenChooser());

    expect(open).toHaveBeenCalledTimes(1);
  });

  it("stays shut for a logged-out visitor", () => {
    scope.value = { scope: "anon", isReady: true, isAuthenticated: false };

    renderHook(() => useAutoOpenChooser());

    expect(open).not.toHaveBeenCalled();
  });

  it("waits for auth to settle", () => {
    scope.value = { scope: "anon", isReady: false, isAuthenticated: false };

    renderHook(() => useAutoOpenChooser());

    expect(open).not.toHaveBeenCalled();
  });

  it("stays shut on tenant deployments", () => {
    whitelabel.value = { isWhitelabel: true };

    renderHook(() => useAutoOpenChooser());

    expect(open).not.toHaveBeenCalled();
  });

  it("respects an explicit opt-out", () => {
    markCompleted("did:privy:me", CHOOSER_SURFACE);

    renderHook(() => useAutoOpenChooser());

    expect(open).not.toHaveBeenCalled();
  });

  it("keeps one user's opt-out off another account on the same browser", () => {
    markCompleted("did:privy:someone-else", CHOOSER_SURFACE);

    renderHook(() => useAutoOpenChooser());

    expect(open).toHaveBeenCalledTimes(1);
  });
});

describe("the opt-out control", () => {
  it("starts unticked and persists when ticked", () => {
    const { result } = renderHook(() => useChooserSuppression());
    expect(result.current.suppressed).toBe(false);

    act(() => result.current.setSuppressed(true));

    expect(result.current.suppressed).toBe(true);
    expect(readOnboardingRecord("did:privy:me", CHOOSER_SURFACE)?.outcome).toBe("completed");
  });

  it("clears the record when unticked, so it offers itself again", () => {
    markCompleted("did:privy:me", CHOOSER_SURFACE);
    const { result } = renderHook(() => useChooserSuppression());
    expect(result.current.suppressed).toBe(true);

    act(() => result.current.setSuppressed(false));

    expect(readOnboardingRecord("did:privy:me", CHOOSER_SURFACE)).toBeNull();
  });

  it("does not opt the user out just because they closed the dialog", () => {
    // Closing writes nothing — only the checkbox does.
    renderHook(() => useAutoOpenChooser());

    expect(readOnboardingRecord("did:privy:me", CHOOSER_SURFACE)).toBeNull();
  });
});
