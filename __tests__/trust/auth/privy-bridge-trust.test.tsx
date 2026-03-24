/**
 * @file Trust tests for PrivyBridgeContext
 * @description Tests defaults before SDK loads, bridge updates, loadPrivy trigger,
 * and hook return values.
 */

import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

// Undo any global mocks
vi.unmock("@/contexts/privy-bridge-context");

// We need to import directly since this context is the thing under test
import {
  PRIVY_BRIDGE_DEFAULTS,
  PrivyBridgeProvider,
  useLoadPrivy,
  usePrivyBridge,
  usePrivyBridgeSetter,
  usePrivyLoadRequested,
} from "@/contexts/privy-bridge-context";

// ---------------------------------------------------------------------------
// Wrapper
// ---------------------------------------------------------------------------
function BridgeWrapper({ children }: { children: ReactNode }) {
  return <PrivyBridgeProvider>{children}</PrivyBridgeProvider>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("PrivyBridgeContext — Defaults before SDK loads", () => {
  it("ready defaults to false", () => {
    const { result } = renderHook(() => usePrivyBridge(), { wrapper: BridgeWrapper });
    expect(result.current.ready).toBe(false);
  });

  it("authenticated defaults to false", () => {
    const { result } = renderHook(() => usePrivyBridge(), { wrapper: BridgeWrapper });
    expect(result.current.authenticated).toBe(false);
  });

  it("user defaults to null", () => {
    const { result } = renderHook(() => usePrivyBridge(), { wrapper: BridgeWrapper });
    expect(result.current.user).toBeNull();
  });

  it("wallets defaults to empty array", () => {
    const { result } = renderHook(() => usePrivyBridge(), { wrapper: BridgeWrapper });
    expect(result.current.wallets).toEqual([]);
  });

  it("login is a noop function", () => {
    const { result } = renderHook(() => usePrivyBridge(), { wrapper: BridgeWrapper });
    expect(() => result.current.login()).not.toThrow();
  });

  it("logout is an async noop function", async () => {
    const { result } = renderHook(() => usePrivyBridge(), { wrapper: BridgeWrapper });
    await expect(result.current.logout()).resolves.toBeUndefined();
  });

  it("getAccessToken returns null by default", async () => {
    const { result } = renderHook(() => usePrivyBridge(), { wrapper: BridgeWrapper });
    const token = await result.current.getAccessToken();
    expect(token).toBeNull();
  });

  it("isConnected defaults to false", () => {
    const { result } = renderHook(() => usePrivyBridge(), { wrapper: BridgeWrapper });
    expect(result.current.isConnected).toBe(false);
  });
});

describe("PrivyBridgeContext — Bridge updates", () => {
  it("updates bridge value when setter is called", () => {
    const { result } = renderHook(
      () => ({
        bridge: usePrivyBridge(),
        setter: usePrivyBridgeSetter(),
      }),
      { wrapper: BridgeWrapper }
    );

    expect(result.current.bridge.ready).toBe(false);

    const updatedValue = {
      ...PRIVY_BRIDGE_DEFAULTS,
      ready: true,
      authenticated: true,
      user: { id: "test-user" } as any,
    };

    act(() => {
      result.current.setter(updatedValue);
    });

    expect(result.current.bridge.ready).toBe(true);
    expect(result.current.bridge.authenticated).toBe(true);
    expect(result.current.bridge.user?.id).toBe("test-user");
  });
});

describe("PrivyBridgeContext — loadPrivy", () => {
  it("loadRequested starts false", () => {
    const { result } = renderHook(() => usePrivyLoadRequested(), {
      wrapper: BridgeWrapper,
    });
    expect(result.current).toBe(false);
  });

  it("loadPrivy sets loadRequested to true", () => {
    const { result } = renderHook(
      () => ({
        loadRequested: usePrivyLoadRequested(),
        loadPrivy: useLoadPrivy(),
      }),
      { wrapper: BridgeWrapper }
    );

    expect(result.current.loadRequested).toBe(false);

    act(() => {
      result.current.loadPrivy();
    });

    expect(result.current.loadRequested).toBe(true);
  });
});

describe("PrivyBridgeContext — Hook return types", () => {
  it("usePrivyBridge returns PrivyBridgeValue shape", () => {
    const { result } = renderHook(() => usePrivyBridge(), { wrapper: BridgeWrapper });
    const value = result.current;

    expect(typeof value.ready).toBe("boolean");
    expect(typeof value.authenticated).toBe("boolean");
    expect(typeof value.login).toBe("function");
    expect(typeof value.logout).toBe("function");
    expect(typeof value.getAccessToken).toBe("function");
    expect(typeof value.connectWallet).toBe("function");
    expect(Array.isArray(value.wallets)).toBe(true);
    expect(typeof value.isConnected).toBe("boolean");
  });

  it("PRIVY_BRIDGE_DEFAULTS matches expected shape", () => {
    expect(PRIVY_BRIDGE_DEFAULTS).toEqual({
      ready: false,
      authenticated: false,
      user: null,
      login: expect.any(Function),
      logout: expect.any(Function),
      getAccessToken: expect.any(Function),
      connectWallet: expect.any(Function),
      wallets: [],
      smartWalletClient: null,
      isConnected: false,
    });
  });
});
