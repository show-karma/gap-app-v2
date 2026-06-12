/**
 * @file Integration test: PrivyOriginDiagnostic arming through the REAL bridge.
 * @description Unlike the unit suite (which mocks usePrivyLoginAttempted), this
 * renders the real PrivyBridgeProvider, pushes a bridge value the way
 * PrivyBridgeUpdater does, and simulates the actual sign-in interaction
 * (clicking a button that calls bridge.login). It guards against the diagnostic
 * regressing into dead code: if the arming flag stops being set by a real login
 * attempt, the "banner appears after sign-in + 403" assertion fails.
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";

const mockEnv = { VERCEL_ENV: "preview" as string | undefined };
vi.mock("@/utilities/enviromentVars", () => ({
  get envVars() {
    return { VERCEL_ENV: mockEnv.VERCEL_ENV };
  },
}));

import { PrivyOriginDiagnostic } from "@/components/Utilities/PrivyOriginDiagnostic";
import {
  PRIVY_BRIDGE_DEFAULTS,
  PrivyBridgeProvider,
  type PrivyBridgeValue,
  usePrivyBridge,
  usePrivyBridgeSetter,
} from "@/contexts/privy-bridge-context";

// ---------------------------------------------------------------------------
// PerformanceObserver mock (same contract as the unit suite)
// ---------------------------------------------------------------------------
type ObserverCallback = (list: { getEntries: () => PerformanceEntry[] }) => void;

let lastObserverCallback: ObserverCallback | null = null;

function installPerformanceObserver() {
  lastObserverCallback = null;
  class MockPerformanceObserver {
    constructor(cb: ObserverCallback) {
      lastObserverCallback = cb;
    }
    observe() {}
    disconnect() {}
  }
  vi.stubGlobal("PerformanceObserver", MockPerformanceObserver);
}

function emitPrivy403() {
  const entry = {
    entryType: "resource",
    name: "https://auth.privy.io/api/v1/siwe/init",
    responseStatus: 403,
  } as unknown as PerformanceEntry;
  act(() => {
    lastObserverCallback?.({ getEntries: () => [entry] });
  });
}

// ---------------------------------------------------------------------------
// Harness: mirrors the production wiring. PrivyBridgeUpdater pushes the Privy
// SDK's values through usePrivyBridgeSetter; sign-in UI calls bridge.login.
// ---------------------------------------------------------------------------
function BridgeUpdater({ value }: { value: PrivyBridgeValue }) {
  const setBridge = usePrivyBridgeSetter();
  useEffect(() => {
    setBridge(value);
  }, [setBridge, value]);
  return null;
}

function SignInButton() {
  const { login } = usePrivyBridge();
  return (
    <button type="button" onClick={login}>
      Sign in
    </button>
  );
}

function Harness({ value }: { value: PrivyBridgeValue }) {
  return (
    <PrivyBridgeProvider>
      <BridgeUpdater value={value} />
      <SignInButton />
      <PrivyOriginDiagnostic />
    </PrivyBridgeProvider>
  );
}

function makeBridgeValue(overrides: Partial<PrivyBridgeValue> = {}): PrivyBridgeValue {
  return { ...PRIVY_BRIDGE_DEFAULTS, ready: true, ...overrides };
}

describe("PrivyOriginDiagnostic + real PrivyBridgeProvider (integration)", () => {
  beforeEach(() => {
    mockEnv.VERCEL_ENV = "preview";
    installPerformanceObserver();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("arms via a real sign-in click and shows the banner on a Privy 403", () => {
    const privyLogin = vi.fn();
    render(<Harness value={makeBridgeValue({ login: privyLogin })} />);

    // Before any login attempt the diagnostic is unarmed: no observer is
    // registered, so even a 403 cannot trip it.
    expect(lastObserverCallback).toBeNull();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    // The actual sign-in interaction: clicking login goes through the bridge,
    // which both records the attempt and invokes Privy's login().
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(privyLogin).toHaveBeenCalledTimes(1);

    // Armed now — the origin-rejection 403 trips the advisory.
    expect(lastObserverCallback).not.toBeNull();
    emitPrivy403();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /runbook/i })).toBeInTheDocument();
  });

  it("clears the banner when authentication later succeeds", () => {
    const { rerender } = render(<Harness value={makeBridgeValue()} />);

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    emitPrivy403();
    expect(screen.getByRole("alert")).toBeInTheDocument();

    // Origin gets allowlisted, retry succeeds: the updater pushes authenticated.
    rerender(<Harness value={makeBridgeValue({ authenticated: true })} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("never arms outside preview even after a sign-in attempt and a 403", () => {
    mockEnv.VERCEL_ENV = "production";
    render(<Harness value={makeBridgeValue()} />);

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    emitPrivy403();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
