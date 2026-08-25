import {
  questsCompletedByGrant,
  questsCompletedByRead,
} from "@/src/features/donor-rewards/state/quest-logic";
import type { Quest } from "@/src/features/donor-rewards/types";

const quest = (overrides: Partial<Quest>): Quest => ({
  id: "q",
  title: "Quest",
  description: "",
  xp: 100,
  type: "grant_any",
  goal: 1,
  progress: 0,
  ...overrides,
});

describe("questsCompletedByGrant", () => {
  it("matches grant_any, matching grant_cause, and recurring quests one step from goal", () => {
    const quests = [
      quest({ id: "any", type: "grant_any" }),
      quest({ id: "climate", type: "grant_cause", targetCause: "climate" }),
      quest({ id: "arts", type: "grant_cause", targetCause: "arts" }),
      quest({ id: "recurring", type: "recurring" }),
      quest({ id: "reads", type: "read_updates", goal: 2 }),
    ];

    const completed = questsCompletedByGrant(quests, { cause: "climate", recurring: true });

    expect(completed.map((item) => item.id)).toEqual(["any", "climate", "recurring"]);
  });

  it("skips already-completed quests and multi-step quests not at the threshold", () => {
    const quests = [
      quest({ id: "done", type: "grant_any", progress: 1 }),
      quest({ id: "multi", type: "grant_any", goal: 3, progress: 1 }),
      quest({ id: "recurring", type: "recurring" }),
    ];

    expect(questsCompletedByGrant(quests, { cause: "health", recurring: false })).toEqual([]);
  });
});

describe("questsCompletedByRead", () => {
  it("returns read quests that the next read pushes to their goal", () => {
    const quests = [
      quest({ id: "reads", type: "read_updates", goal: 2, progress: 1 }),
      quest({ id: "reads-early", type: "read_updates", goal: 3, progress: 1 }),
      quest({ id: "reads-done", type: "read_updates", goal: 2, progress: 2 }),
      quest({ id: "grant", type: "grant_any" }),
    ];

    expect(questsCompletedByRead(quests).map((item) => item.id)).toEqual(["reads"]);
  });
});
