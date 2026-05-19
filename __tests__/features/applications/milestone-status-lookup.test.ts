/**
 * Tests for buildMilestoneStatusIndex and lookupMilestoneStatus.
 *
 * The lookup helpers are the load-bearing glue between the indexer's
 * server-merged milestoneStatuses[] and the inline badge overlays on
 * ApplicationContent / ApplicationDataView. Same-title milestones
 * across different fields are common (e.g. two fields each with
 * "Milestone 1"), so the (fieldLabel, title) fallback key has to
 * discriminate by fieldLabel.
 */

import {
  buildMilestoneStatusIndex,
  lookupMilestoneStatus,
} from "@/src/features/applications/lib/milestone-status";
import type { MilestoneStatusEntry } from "@/types/whitelabel-entities";

function makeEntry(overrides: Partial<MilestoneStatusEntry> = {}): MilestoneStatusEntry {
  return {
    source: "application",
    milestoneUID: "0xms-default",
    currentStatus: "pending",
    grantUID: "0xgrant",
    chainID: 10,
    title: "Default milestone",
    ...overrides,
  };
}

describe("buildMilestoneStatusIndex", () => {
  it("should_return_empty_index_when_entries_undefined", () => {
    const index = buildMilestoneStatusIndex(undefined);
    expect(index.size).toBe(0);
  });

  it("should_return_empty_index_when_entries_empty", () => {
    const index = buildMilestoneStatusIndex([]);
    expect(index.size).toBe(0);
  });

  it("should_index_each_entry_by_uid_when_milestoneUID_is_present", () => {
    const a = makeEntry({ milestoneUID: "0xa", title: "A" });
    const b = makeEntry({ milestoneUID: "0xb", title: "B" });

    const index = buildMilestoneStatusIndex([a, b]);

    expect(index.get("uid:0xa")).toBe(a);
    expect(index.get("uid:0xb")).toBe(b);
  });

  it("should_index_each_entry_by_label_composite_key", () => {
    const a = makeEntry({
      milestoneUID: undefined,
      fieldLabel: "projectMilestones",
      title: "Beta launch",
    });
    const b = makeEntry({
      milestoneUID: undefined,
      fieldLabel: "extraDeliverables",
      title: "Beta launch",
    });

    const index = buildMilestoneStatusIndex([a, b]);

    // Same title across different fields stays disambiguated.
    expect(lookupMilestoneStatus(index, undefined, "projectMilestones", "Beta launch")).toBe(a);
    expect(lookupMilestoneStatus(index, undefined, "extraDeliverables", "Beta launch")).toBe(b);
  });

  it("should_index_by_both_keys_when_milestoneUID_present_and_fieldLabel_present", () => {
    const a = makeEntry({
      milestoneUID: "0xa",
      fieldLabel: "projectMilestones",
      title: "Beta launch",
    });

    const index = buildMilestoneStatusIndex([a]);

    expect(index.get("uid:0xa")).toBe(a);
    expect(lookupMilestoneStatus(index, undefined, "projectMilestones", "Beta launch")).toBe(a);
  });

  it("should_resolve_intra_field_same_title_collisions_first_write_wins", () => {
    // Two un-anchored milestones in the SAME field with the SAME
    // title. The indexer sorts done entries to the bottom, so the
    // first hit (pending) is the one a displayed badge most likely
    // refers to. Last-write-wins would silently stamp the displayed
    // milestone as "Completed" when the live one is still pending.
    const pending = makeEntry({
      milestoneUID: undefined,
      fieldLabel: "projectMilestones",
      title: "Milestone 1",
      currentStatus: "pending",
    });
    const completed = makeEntry({
      milestoneUID: undefined,
      fieldLabel: "projectMilestones",
      title: "Milestone 1",
      currentStatus: "completed",
      completed: { uid: "c1", createdAt: "2026-01-01" },
    });

    const index = buildMilestoneStatusIndex([pending, completed]);

    const resolved = lookupMilestoneStatus(index, undefined, "projectMilestones", "Milestone 1");
    expect(resolved).toBe(pending);
    expect(resolved).not.toBe(completed);
  });

  it("should_not_collide_when_title_contains_a_colon", () => {
    // A plain `${fieldLabel}:${title}` concatenation would key both
    // entries below to the same string ("label:a:b:c"), silently
    // overwriting the first. JSON-encoding the tuple keeps the array
    // boundaries unambiguous so colons in user-input titles can't
    // forge a colliding key. Titles like "Phase 1: Beta launch" and
    // "Milestone 2: Testing" are common in real grantee submissions.
    const titleHasColon = makeEntry({
      milestoneUID: undefined,
      fieldLabel: "a",
      title: "b:c",
    });
    const fieldHasColon = makeEntry({
      milestoneUID: undefined,
      fieldLabel: "a:b",
      title: "c",
    });

    const index = buildMilestoneStatusIndex([titleHasColon, fieldHasColon]);

    expect(lookupMilestoneStatus(index, undefined, "a", "b:c")).toBe(titleHasColon);
    expect(lookupMilestoneStatus(index, undefined, "a:b", "c")).toBe(fieldHasColon);
  });
});

describe("lookupMilestoneStatus", () => {
  it("should_prefer_uid_match_when_milestoneUID_is_known", () => {
    const a = makeEntry({
      milestoneUID: "0xa",
      fieldLabel: "projectMilestones",
      title: "Beta launch",
    });
    const index = buildMilestoneStatusIndex([a]);

    // Wrong title, but uid hits — should still resolve to a.
    expect(lookupMilestoneStatus(index, "0xa", "wrong", "wrong")).toBe(a);
  });

  it("should_fall_back_to_label_composite_when_milestoneUID_is_absent", () => {
    const a = makeEntry({
      milestoneUID: undefined,
      fieldLabel: "projectMilestones",
      title: "Beta launch",
    });
    const index = buildMilestoneStatusIndex([a]);

    expect(lookupMilestoneStatus(index, undefined, "projectMilestones", "Beta launch")).toBe(a);
  });

  it("should_fall_back_to_label_composite_when_uid_does_not_hit", () => {
    // Stale milestoneUID from a prior version — the entry no longer
    // exposes it but the title+fieldLabel still matches.
    const a = makeEntry({
      milestoneUID: undefined,
      fieldLabel: "projectMilestones",
      title: "Beta launch",
    });
    const index = buildMilestoneStatusIndex([a]);

    expect(lookupMilestoneStatus(index, "0xstale", "projectMilestones", "Beta launch")).toBe(a);
  });

  it("should_return_undefined_when_neither_key_hits", () => {
    const index = buildMilestoneStatusIndex([
      makeEntry({ milestoneUID: "0xa", fieldLabel: "projectMilestones", title: "A" }),
    ]);

    expect(lookupMilestoneStatus(index, "0xother", "otherField", "Other")).toBeUndefined();
  });

  it("should_disambiguate_same_title_entries_by_fieldLabel", () => {
    const inField1 = makeEntry({
      milestoneUID: undefined,
      fieldLabel: "field1",
      title: "Milestone 1",
    });
    const inField2 = makeEntry({
      milestoneUID: undefined,
      fieldLabel: "field2",
      title: "Milestone 1",
    });
    const index = buildMilestoneStatusIndex([inField1, inField2]);

    expect(lookupMilestoneStatus(index, undefined, "field1", "Milestone 1")).toBe(inField1);
    expect(lookupMilestoneStatus(index, undefined, "field2", "Milestone 1")).toBe(inField2);
  });
});
