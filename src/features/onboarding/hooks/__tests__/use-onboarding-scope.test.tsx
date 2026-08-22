import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PRIVY_BRIDGE_DEFAULTS } from "@/contexts/privy-bridge-context";
import {
  ANONYMOUS_SCOPE,
  markCompleted,
  readOnboardingRecord,
  tourSurface,
} from "../../lib/storage";
import { useOnboardingScope } from "../use-onboarding-scope";

// `vi.hoisted` runs before the imports resolve, so the seed can't reference
// PRIVY_BRIDGE_DEFAULTS here — beforeEach fills it in.
const bridge = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));

vi.mock("@/contexts/privy-bridge-context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/contexts/privy-bridge-context")>()),
  usePrivyBridge: () => bridge.value,
}));

const SURFACE = tourSurface("find-funders", 1);

/**
 * The anonymous-state migration is guarded by a module-level set that persists
 * across specs, so each test that exercises it needs an identity of its own.
 */
let userCounter = 0;
const nextUserId = () => `did:privy:user-${++userCounter}`;

function setBridge(overrides: Partial<typeof PRIVY_BRIDGE_DEFAULTS> = {}) {
  bridge.value = { ...PRIVY_BRIDGE_DEFAULTS, ...overrides };
}

beforeEach(() => {
  localStorage.clear();
  setBridge({});
});

describe("while Privy is settling", () => {
  it("reports not-ready before Privy initialises", () => {
    setBridge({ ready: false });

    const { result } = renderHook(() => useOnboardingScope());

    expect(result.current.isReady).toBe(false);
  });

  it("stays not-ready when authenticated but the user object hasn't landed", () => {
    setBridge({ ready: true, authenticated: true, user: null });

    const { result } = renderHook(() => useOnboardingScope());

    expect(result.current.isReady).toBe(false);
    expect(result.current.isAuthenticated).toBe(true);
  });
});

describe("resolved scope", () => {
  it("uses the anonymous scope for a logged-out visitor", () => {
    setBridge({ ready: true, authenticated: false });

    const { result } = renderHook(() => useOnboardingScope());

    expect(result.current).toMatchObject({
      scope: ANONYMOUS_SCOPE,
      isReady: true,
      isAuthenticated: false,
    });
  });

  it("uses the Privy DID once signed in", () => {
    const userId = nextUserId();
    setBridge({ ready: true, authenticated: true, user: { id: userId } as never });

    const { result } = renderHook(() => useOnboardingScope());

    expect(result.current).toMatchObject({
      scope: userId,
      isReady: true,
      isAuthenticated: true,
    });
  });
});

describe("anonymous migration", () => {
  it("folds logged-out progress onto the user on sign-in", async () => {
    const userId = nextUserId();
    markCompleted(ANONYMOUS_SCOPE, SURFACE);
    setBridge({ ready: true, authenticated: true, user: { id: userId } as never });

    renderHook(() => useOnboardingScope());

    await waitFor(() => {
      expect(readOnboardingRecord(userId, SURFACE)?.outcome).toBe("completed");
    });
    expect(readOnboardingRecord(ANONYMOUS_SCOPE, SURFACE)).toBeNull();
  });

  it("does not migrate while Privy is still initialising", () => {
    const userId = nextUserId();
    markCompleted(ANONYMOUS_SCOPE, SURFACE);
    setBridge({ ready: false, authenticated: true, user: { id: userId } as never });

    renderHook(() => useOnboardingScope());

    expect(readOnboardingRecord(ANONYMOUS_SCOPE, SURFACE)?.outcome).toBe("completed");
    expect(readOnboardingRecord(userId, SURFACE)).toBeNull();
  });

  it("runs once even when several components ask for the scope", async () => {
    const userId = nextUserId();
    setBridge({ ready: true, authenticated: true, user: { id: userId } as never });

    renderHook(() => useOnboardingScope());
    await waitFor(() => expect(bridge.value.ready).toBe(true));

    // A later anonymous entry must survive: the barrier has already fired for
    // this user, so nothing should sweep it up mid-session.
    markCompleted(ANONYMOUS_SCOPE, SURFACE);
    renderHook(() => useOnboardingScope());

    expect(readOnboardingRecord(ANONYMOUS_SCOPE, SURFACE)?.outcome).toBe("completed");
  });
});
