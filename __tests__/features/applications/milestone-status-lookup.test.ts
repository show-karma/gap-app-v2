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
    expect(index.get("label:projectMilestones:Beta launch")).toBe(a);
    expect(index.get("label:extraDeliverables:Beta launch")).toBe(b);
  });

  it("should_index_by_both_keys_when_milestoneUID_present_and_fieldLabel_present", () => {
    const a = makeEntry({
      milestoneUID: "0xa",
      fieldLabel: "projectMilestones",
      title: "Beta launch",
    });

    const index = buildMilestoneStatusIndex([a]);

    expect(index.get("uid:0xa")).toBe(a);
    expect(index.get("label:projectMilestones:Beta launch")).toBe(a);
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

    expect(
      lookupMilestoneStatus(index, undefined, "projectMilestones", "Beta launch")
    ).toBe(a);
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

    expect(
      lookupMilestoneStatus(index, "0xstale", "projectMilestones", "Beta launch")
    ).toBe(a);
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
