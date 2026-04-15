import { describe, expect, it } from "vitest";
import { buildPositionalCompletionMap } from "../milestone-utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeCompletion(fieldLabel: string, title: string, extra?: Record<string, unknown>) {
  return {
    id: Math.random().toString(36).slice(2),
    milestoneFieldLabel: fieldLabel,
    milestoneTitle: title,
    completionText: "Some completion text",
    isVerified: false,
    ...extra,
  };
}

function makeMilestone(title: string) {
  return { title, description: "", dueDate: "2025-01-01" };
}

// Extract just the titles (or null) from the map for easy assertion
function toTitleArray(
  milestones: { title: string }[],
  map: Map<number, ReturnType<typeof buildPositionalCompletionMap>[0]>
): (string | null)[] {
  return milestones.map((_, i) => map.get(i)?.milestoneTitle ?? null);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("buildPositionalCompletionMap", () => {
  // ─── Basic cases ────────────────────────────────────────────────────────

  it("returns all nulls when there are no completions", () => {
    const milestones = [makeMilestone("A"), makeMilestone("B"), makeMilestone("C")];
    const map = buildPositionalCompletionMap(milestones, [], "field");
    expect(map.size).toBe(3);
    expect(map.get(0)).toBeNull();
    expect(map.get(1)).toBeNull();
    expect(map.get(2)).toBeNull();
  });

  it("returns all nulls for empty milestones array", () => {
    const completions = [makeCompletion("field", "A")];
    const map = buildPositionalCompletionMap([], completions, "field");
    expect(map.size).toBe(0);
  });

  it("matches a single completion to a single milestone", () => {
    const milestones = [makeMilestone("A")];
    const completions = [makeCompletion("field", "A")];
    const map = buildPositionalCompletionMap(milestones, completions, "field");

    expect(map.size).toBe(1);
    expect(map.get(0)).toEqual(completions[0]);
  });

  it("matches unique titles 1:1", () => {
    const milestones = [makeMilestone("A"), makeMilestone("B"), makeMilestone("C")];
    const completions = [
      makeCompletion("field", "A"),
      makeCompletion("field", "B"),
      makeCompletion("field", "C"),
    ];
    const map = buildPositionalCompletionMap(milestones, completions, "field");

    expect(map.get(0)).toEqual(completions[0]);
    expect(map.get(1)).toEqual(completions[1]);
    expect(map.get(2)).toEqual(completions[2]);
  });

  it("returns null for milestones without matching completions", () => {
    const milestones = [makeMilestone("A"), makeMilestone("B"), makeMilestone("C")];
    const completions = [makeCompletion("field", "B")];
    const map = buildPositionalCompletionMap(milestones, completions, "field");

    expect(map.get(0)).toBeNull();
    expect(map.get(1)).toEqual(completions[0]);
    expect(map.get(2)).toBeNull();
  });

  // ─── Duplicate title cases (the core dedup fix) ─────────────────────────

  it("assigns exactly one completion when 10 milestones share the same title but only 1 completion exists", () => {
    const milestones = Array.from({ length: 10 }, () => makeMilestone("Milestone 1"));
    const completions = [makeCompletion("field", "Milestone 1")];
    const map = buildPositionalCompletionMap(milestones, completions, "field");

    // Only index 0 should have the completion
    expect(map.get(0)).toEqual(completions[0]);
    for (let i = 1; i < 10; i++) {
      expect(map.get(i)).toBeNull();
    }
  });

  it("assigns completions to the first N milestones when N completions exist for duplicate titles", () => {
    const milestones = Array.from({ length: 5 }, () => makeMilestone("Same Title"));
    const completions = [
      makeCompletion("field", "Same Title"),
      makeCompletion("field", "Same Title"),
      makeCompletion("field", "Same Title"),
    ];
    const map = buildPositionalCompletionMap(milestones, completions, "field");

    expect(map.get(0)).toEqual(completions[0]);
    expect(map.get(1)).toEqual(completions[1]);
    expect(map.get(2)).toEqual(completions[2]);
    expect(map.get(3)).toBeNull();
    expect(map.get(4)).toBeNull();
  });

  it("assigns all completions when every duplicate milestone has one", () => {
    const milestones = Array.from({ length: 3 }, () => makeMilestone("M"));
    const completions = [
      makeCompletion("field", "M", { completionText: "first" }),
      makeCompletion("field", "M", { completionText: "second" }),
      makeCompletion("field", "M", { completionText: "third" }),
    ];
    const map = buildPositionalCompletionMap(milestones, completions, "field");

    expect(map.get(0)!.completionText).toBe("first");
    expect(map.get(1)!.completionText).toBe("second");
    expect(map.get(2)!.completionText).toBe("third");
  });

  // ─── Mixed unique + duplicate titles ─────────────────────────────────────

  it("handles a mix of unique and duplicate titles", () => {
    const milestones = [
      makeMilestone("A"),
      makeMilestone("B"),
      makeMilestone("B"),
      makeMilestone("B"),
      makeMilestone("C"),
    ];
    // 2 completions for "B", 1 for "A", 0 for "C"
    const completions = [
      makeCompletion("field", "A"),
      makeCompletion("field", "B", { completionText: "B-1" }),
      makeCompletion("field", "B", { completionText: "B-2" }),
    ];
    const map = buildPositionalCompletionMap(milestones, completions, "field");

    expect(map.get(0)!.milestoneTitle).toBe("A");
    expect(map.get(1)!.completionText).toBe("B-1");
    expect(map.get(2)!.completionText).toBe("B-2");
    expect(map.get(3)).toBeNull(); // 3rd "B" has no completion
    expect(map.get(4)).toBeNull(); // "C" has no completion
  });

  it("handles completions interleaved with different field labels", () => {
    const milestones = [makeMilestone("X"), makeMilestone("Y"), makeMilestone("X")];
    const completions = [
      makeCompletion("field", "X", { completionText: "X-1" }),
      makeCompletion("otherField", "X", { completionText: "wrong-field" }),
      makeCompletion("field", "X", { completionText: "X-2" }),
    ];
    const map = buildPositionalCompletionMap(milestones, completions, "field");

    // Only completions with matching fieldLabel "field" should be assigned
    expect(map.get(0)!.completionText).toBe("X-1");
    expect(map.get(1)).toBeNull(); // "Y" has no completion
    expect(map.get(2)!.completionText).toBe("X-2");
  });

  // ─── Whitespace / normalization ─────────────────────────────────────────

  it("trims whitespace when matching titles", () => {
    const milestones = [makeMilestone("  A  "), makeMilestone("A")];
    const completions = [makeCompletion("field", "A"), makeCompletion("field", "  A  ")];
    const map = buildPositionalCompletionMap(milestones, completions, "field");

    // Both should match since titles are trimmed
    expect(map.get(0)).not.toBeNull();
    expect(map.get(1)).not.toBeNull();
  });

  it("trims whitespace when matching field labels", () => {
    const milestones = [makeMilestone("A")];
    const completions = [makeCompletion("  field  ", "A")];
    const map = buildPositionalCompletionMap(milestones, completions, "field");

    expect(map.get(0)).toEqual(completions[0]);
  });

  // ─── Edge cases ─────────────────────────────────────────────────────────

  it("does not assign the same completion to two different milestones", () => {
    const milestones = [makeMilestone("A"), makeMilestone("A")];
    const completion = makeCompletion("field", "A");
    const map = buildPositionalCompletionMap(milestones, [completion], "field");

    // Only the first milestone gets the completion
    expect(map.get(0)).toBe(completion);
    expect(map.get(1)).toBeNull();
  });

  it("preserves completion order (first completion → first milestone)", () => {
    const milestones = [makeMilestone("A"), makeMilestone("A")];
    const c1 = makeCompletion("field", "A", { completionText: "FIRST" });
    const c2 = makeCompletion("field", "A", { completionText: "SECOND" });
    const map = buildPositionalCompletionMap(milestones, [c1, c2], "field");

    expect(map.get(0)!.completionText).toBe("FIRST");
    expect(map.get(1)!.completionText).toBe("SECOND");
  });

  it("handles completions that appear in different order than milestones", () => {
    // Milestones: A, B, A
    // Completions: A (2nd), B, A (1st) — server returns them out of order
    const milestones = [makeMilestone("A"), makeMilestone("B"), makeMilestone("A")];
    const cA2 = makeCompletion("field", "A", { completionText: "A-second" });
    const cB = makeCompletion("field", "B", { completionText: "B-first" });
    const cA1 = makeCompletion("field", "A", { completionText: "A-first" });
    const map = buildPositionalCompletionMap(milestones, [cA2, cB, cA1], "field");

    // Positional: first "A" milestone gets first "A" completion in array order
    expect(map.get(0)!.completionText).toBe("A-second");
    expect(map.get(1)!.completionText).toBe("B-first");
    expect(map.get(2)!.completionText).toBe("A-first");
  });

  it("handles empty field label", () => {
    const milestones = [makeMilestone("A")];
    const completions = [makeCompletion("", "A")];
    const map = buildPositionalCompletionMap(milestones, completions, "");

    expect(map.get(0)).toEqual(completions[0]);
  });

  it("handles milestones with empty titles", () => {
    const milestones = [makeMilestone(""), makeMilestone("")];
    const completions = [makeCompletion("field", "")];
    const map = buildPositionalCompletionMap(milestones, completions, "field");

    expect(map.get(0)).toEqual(completions[0]);
    expect(map.get(1)).toBeNull();
  });

  // ─── Scale test ─────────────────────────────────────────────────────────

  it("handles 100 milestones with 50 completions correctly", () => {
    const milestones = Array.from({ length: 100 }, () => makeMilestone("Same"));
    const completions = Array.from({ length: 50 }, (_, i) =>
      makeCompletion("field", "Same", { completionText: `completion-${i}` })
    );
    const map = buildPositionalCompletionMap(milestones, completions, "field");

    expect(map.size).toBe(100);
    for (let i = 0; i < 50; i++) {
      expect(map.get(i)).not.toBeNull();
      expect(map.get(i)!.completionText).toBe(`completion-${i}`);
    }
    for (let i = 50; i < 100; i++) {
      expect(map.get(i)).toBeNull();
    }
  });
});
