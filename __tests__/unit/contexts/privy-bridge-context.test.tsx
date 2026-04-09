import { act, renderHook } from "@testing-library/react";
import type React from "react";
import {
  PrivyBridgeProvider,
  useLoadPrivy,
  usePrivyLoadRequested,
} from "@/contexts/privy-bridge-context";

describe("PrivyBridgeProvider", () => {
  it("should export useLoadPrivy hook", () => {
    expect(useLoadPrivy).toBeDefined();
    expect(typeof useLoadPrivy).toBe("function");
  });

  it("should export usePrivyLoadRequested hook", () => {
    expect(usePrivyLoadRequested).toBeDefined();
    expect(typeof usePrivyLoadRequested).toBe("function");
  });

  it("should provide a loadPrivy callback that triggers load requested", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PrivyBridgeProvider>{children}</PrivyBridgeProvider>
    );

    const { result } = renderHook(
      () => ({
        loadPrivy: useLoadPrivy(),
        loadRequested: usePrivyLoadRequested(),
      }),
      { wrapper }
    );

    expect(result.current.loadRequested).toBe(false);

    act(() => {
      result.current.loadPrivy();
    });

    expect(result.current.loadRequested).toBe(true);
  });

  it("should default loadRequested to false", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PrivyBridgeProvider>{children}</PrivyBridgeProvider>
    );

    const { result } = renderHook(() => usePrivyLoadRequested(), { wrapper });
    expect(result.current).toBe(false);
  });
});
