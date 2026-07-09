/**
 * Unit tests for donor-rewards/state/rewards-context.tsx grant accounting.
 *
 * These lock in the windfall-first invariant behind the Gains card's promise:
 * granting your investment gains must never draw down the principal balance.
 */

import { act, renderHook } from "@testing-library/react";
import type React from "react";
import { describe, expect, it } from "vitest";
import { INITIAL_STATE } from "../../data/mock-data";
import { RewardsProvider, useRewards } from "../rewards-context";

const ORG_ID = "org-rainforest";

function wrapper({ children }: { children: React.ReactNode }) {
  return <RewardsProvider>{children}</RewardsProvider>;
}

describe("rewards grant accounting", () => {
  it("spends investment gains before principal, keeping the balance whole", () => {
    const { result } = renderHook(() => useRewards(), { wrapper });

    act(() => result.current.makeGrant(ORG_ID, 500, false));

    // 500 <= 3850 gains, so the whole grant comes from gains and the
    // "ready to deploy" balance is untouched.
    expect(result.current.state.balance).toBe(INITIAL_STATE.balance);
    expect(result.current.state.investmentGains).toBe(INITIAL_STATE.investmentGains - 500);
    expect(result.current.state.grantedThisYear).toBe(INITIAL_STATE.grantedThisYear + 500);
    expect(result.current.state.lifetimeGranted).toBe(INITIAL_STATE.lifetimeGranted + 500);
  });

  it("granting the full gains amount zeroes gains and leaves the balance whole", () => {
    const { result } = renderHook(() => useRewards(), { wrapper });

    act(() => result.current.makeGrant(ORG_ID, INITIAL_STATE.investmentGains, false));

    expect(result.current.state.investmentGains).toBe(0);
    expect(result.current.state.balance).toBe(INITIAL_STATE.balance);
  });

  it("draws principal only for the portion of a grant beyond the remaining gains", () => {
    const { result } = renderHook(() => useRewards(), { wrapper });
    const overGains = INITIAL_STATE.investmentGains + 1000;

    act(() => result.current.makeGrant(ORG_ID, overGains, false));

    expect(result.current.state.investmentGains).toBe(0);
    expect(result.current.state.balance).toBe(INITIAL_STATE.balance - 1000);
    expect(result.current.state.grantedThisYear).toBe(INITIAL_STATE.grantedThisYear + overGains);
  });
});
