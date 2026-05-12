import { describe, expect, it } from "vitest";
import type { CommunityReviewer } from "@/services/community-reviewers/community-reviewers.types";
import {
  emptyNewRow,
  isRowDirty,
  type PoolPickedRow,
  poolRowFromReviewer,
  roleSelectionFromCommunityRole,
} from "../ReviewerPickerModal.types";

const baseReviewer: CommunityReviewer = {
  publicAddress: "0xabc",
  name: "Alice",
  email: "alice@example.com",
  telegram: "alice_tg",
  slack: "alice_slack",
  picture: undefined,
  roles: ["program-reviewer"],
  lastSeenAt: new Date("2024-01-01").toISOString(),
};

function makePoolRow(overrides: Partial<PoolPickedRow> = {}): PoolPickedRow {
  return {
    ...poolRowFromReviewer(baseReviewer, "program"),
    ...overrides,
  };
}

describe("poolRowFromReviewer", () => {
  it("should_build_pool_row_with_default_role_from_launcher_when_reviewer_has_that_role", () => {
    const row = poolRowFromReviewer(
      { ...baseReviewer, roles: ["program-reviewer", "milestone-reviewer"] },
      "milestone"
    );

    expect(row.kind).toBe("pool");
    expect(row.id).toBe(baseReviewer.publicAddress);
    expect(row.publicAddress).toBe(baseReviewer.publicAddress);
    expect(row.roles).toEqual(["milestone"]);
    expect(row.name).toBe("Alice");
    expect(row.email).toBe("alice@example.com");
    expect(row.telegram).toBe("alice_tg");
    expect(row.slack).toBe("alice_slack");
    expect(row.original).toEqual({
      name: "Alice",
      email: "alice@example.com",
      telegram: "alice_tg",
      slack: "alice_slack",
    });
  });

  it("should_fall_back_to_reviewer_existing_role_when_launcher_role_not_held", () => {
    const row = poolRowFromReviewer({ ...baseReviewer, roles: ["milestone-reviewer"] }, "program");
    expect(row.roles).toEqual(["milestone"]);
  });

  it("should_use_launcher_role_when_reviewer_has_no_roles", () => {
    const row = poolRowFromReviewer({ ...baseReviewer, roles: [] }, "milestone");
    expect(row.roles).toEqual(["milestone"]);
  });

  it("should_default_missing_telegram_and_slack_to_empty_strings", () => {
    const row = poolRowFromReviewer({ ...baseReviewer, telegram: null, slack: null }, "program");
    expect(row.telegram).toBe("");
    expect(row.slack).toBe("");
    expect(row.original.telegram).toBe("");
    expect(row.original.slack).toBe("");
  });
});

describe("isRowDirty", () => {
  it("should_return_false_when_no_fields_changed", () => {
    expect(isRowDirty(makePoolRow())).toBe(false);
  });

  it.each([
    ["name", { name: "Renamed" }],
    ["email", { email: "new@example.com" }],
    ["telegram", { telegram: "new_tg" }],
    ["slack", { slack: "new_slack" }],
  ])("should_return_true_when_%s_changed", (_field, overrides) => {
    expect(isRowDirty(makePoolRow(overrides as Partial<PoolPickedRow>))).toBe(true);
  });
});

describe("emptyNewRow", () => {
  it("should_return_blank_fields_with_launcher_role", () => {
    const row = emptyNewRow("uuid-1", "milestone");
    expect(row).toEqual({
      kind: "new",
      id: "uuid-1",
      name: "",
      email: "",
      telegram: "",
      slack: "",
      roles: ["milestone"],
    });
  });
});

describe("roleSelectionFromCommunityRole", () => {
  it("should_map_milestone_reviewer_to_milestone", () => {
    expect(roleSelectionFromCommunityRole("milestone-reviewer")).toBe("milestone");
  });

  it("should_map_program_reviewer_to_program", () => {
    expect(roleSelectionFromCommunityRole("program-reviewer")).toBe("program");
  });
});
