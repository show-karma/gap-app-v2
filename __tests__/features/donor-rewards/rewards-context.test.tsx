/**
 * Economy-integrity tests for the donor-rewards reducer.
 *
 * The core invariant: the IP the UI advertises for an action must equal the
 * IP the reducer credits. Both sides derive quest completions from
 * quest-logic.ts, and these tests pin the credited side.
 */

import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  INITIAL_STATE,
  XP_NEW_CAUSE_BONUS,
  XP_PER_GRANT,
  XP_RECURRING_BONUS,
} from "@/src/features/donor-rewards/data/mock-data";
import { RewardsProvider, useRewards } from "@/src/features/donor-rewards/state/rewards-context";

const wrapper = ({ children }: { children: ReactNode }) => (
  <RewardsProvider>{children}</RewardsProvider>
);

function renderRewards() {
  return renderHook(() => useRewards(), { wrapper });
}

describe("rewards reducer — grants", () => {
  it("credits grant XP plus new-cause bonus plus completed grant quests", () => {
    const { result } = renderRewards();

    // org-rainforest is climate — a new cause — and completes both the
    // climate quest (+120) and the grant-anything quest (+80).
    act(() => result.current.makeGrant("org-rainforest", 500, false));

    const expectedXp = XP_PER_GRANT + XP_NEW_CAUSE_BONUS + 120 + 80;
    expect(result.current.state.xp).toBe(INITIAL_STATE.xp + expectedXp);
    expect(result.current.state.celebration?.xpEarned).toBe(expectedXp);
    expect(result.current.state.celebration?.questsCompleted.map((quest) => quest.id)).toEqual([
      "q-climate",
      "q-any-grant",
    ]);
  });

  it("credits recurring bonus and recurring quest, and unlocks the recurring badge", () => {
    const { result } = renderRewards();

    // org-tutors is education — already supported, so no new-cause bonus.
    act(() => result.current.makeGrant("org-tutors", 150, true));

    const expectedXp = XP_PER_GRANT + XP_RECURRING_BONUS + 80 + 150;
    expect(result.current.state.celebration?.xpEarned).toBe(expectedXp);
    expect(result.current.state.hasRecurringGrant).toBe(true);
    expect(result.current.state.badges.find((badge) => badge.id === "b-recurring")?.unlocked).toBe(
      true
    );
  });

  it("extends the streak on the first grant of the month only", () => {
    const { result } = renderRewards();

    act(() => result.current.makeGrant("org-tutors", 150, false));
    expect(result.current.state.streakMonths).toBe(INITIAL_STATE.streakMonths + 1);
    expect(result.current.state.celebration?.newStreak).toBe(INITIAL_STATE.streakMonths + 1);

    act(() => result.current.makeGrant("org-meals", 100, false));
    expect(result.current.state.streakMonths).toBe(INITIAL_STATE.streakMonths + 1);
    expect(result.current.state.celebration?.newStreak).toBeNull();
  });

  it("debits the balance and adds the grant record", () => {
    const { result } = renderRewards();

    act(() => result.current.makeGrant("org-meals", 250, false));

    expect(result.current.state.balance).toBe(INITIAL_STATE.balance - 250);
    expect(result.current.state.grantedThisYear).toBe(INITIAL_STATE.grantedThisYear + 250);
    expect(result.current.state.grants).toHaveLength(1);
    expect(result.current.state.grants[0]).toMatchObject({
      orgId: "org-meals",
      amount: 250,
      recurring: false,
    });
  });

  it("ignores a grant to an unknown org", () => {
    const { result } = renderRewards();

    act(() => result.current.makeGrant("org-nope", 250, false));

    expect(result.current.state).toEqual(INITIAL_STATE);
  });

  it("clears the celebration on dismiss", () => {
    const { result } = renderRewards();

    act(() => result.current.makeGrant("org-meals", 100, false));
    expect(result.current.state.celebration).not.toBeNull();

    act(() => result.current.dismissCelebration());
    expect(result.current.state.celebration).toBeNull();
  });
});

describe("rewards reducer — reading updates", () => {
  it("credits the update XP plus the quest bonus when the read completes a quest, and records it", () => {
    const { result } = renderRewards();

    // q-updates starts at 1/2 with +60 IP, so the first read completes it.
    act(() => result.current.readUpdate("u-harvest"));

    const readUpdatesQuest = result.current.state.quests.find((quest) => quest.id === "q-updates");
    expect(readUpdatesQuest?.progress).toBe(2);
    expect(result.current.state.xp).toBe(INITIAL_STATE.xp + 15 + 60);
    expect(
      result.current.state.updates.find((update) => update.id === "u-harvest")?.xpAwarded
    ).toBe(75);
  });

  it("credits only the update XP once the read quest is already complete", () => {
    const { result } = renderRewards();

    act(() => result.current.readUpdate("u-harvest"));
    const xpAfterFirst = result.current.state.xp;

    act(() => result.current.readUpdate("u-tutors"));

    expect(result.current.state.xp).toBe(xpAfterFirst + 15);
    expect(result.current.state.updates.find((update) => update.id === "u-tutors")?.xpAwarded).toBe(
      15
    );
  });

  it("is a no-op for an already-read or unknown update", () => {
    const { result } = renderRewards();

    act(() => result.current.readUpdate("u-stage")); // seeded as read
    act(() => result.current.readUpdate("u-missing"));

    expect(result.current.state).toEqual(INITIAL_STATE);
  });
});
