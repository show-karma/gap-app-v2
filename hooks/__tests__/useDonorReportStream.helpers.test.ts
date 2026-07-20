import { describe, expect, it } from "vitest";
import type { FastReportEvent } from "@/types/donor-research";
import { MAX_STREAM_RETRIES, mergeStreamEvents } from "../useDonorReportStream";

const makeEvent = (
  name: FastReportEvent["name"],
  data: Record<string, unknown> = {}
): FastReportEvent => ({
  name,
  reportId: "report-1",
  data,
});

describe("mergeStreamEvents", () => {
  it("should_append_an_event_with_a_new_name", () => {
    const existing = [makeEvent("snapshot")];
    const next = makeEvent("pool_loaded");

    const result = mergeStreamEvents(existing, next);

    expect(result).toHaveLength(2);
    expect(result.map((e) => e.name)).toEqual(["snapshot", "pool_loaded"]);
  });

  it("should_not_mutate_the_existing_array_when_appending", () => {
    const existing = [makeEvent("snapshot")];

    const result = mergeStreamEvents(existing, makeEvent("pool_loaded"));

    expect(existing).toHaveLength(1);
    expect(result).not.toBe(existing);
  });

  it("should_replace_a_duplicate_name_in_place_without_growing", () => {
    const existing = [
      makeEvent("snapshot"),
      makeEvent("pool_loaded"),
      makeEvent("compliance_complete"),
    ];
    const replacement = makeEvent("pool_loaded", { stage: "v2" });

    const result = mergeStreamEvents(existing, replacement);

    // No growth — duplicate replaced, not appended.
    expect(result).toHaveLength(3);
    // First-seen order preserved.
    expect(result.map((e) => e.name)).toEqual(["snapshot", "pool_loaded", "compliance_complete"]);
  });

  it("should_update_the_payload_when_replacing_a_duplicate", () => {
    const existing = [makeEvent("pool_loaded", { stage: "v1" })];
    const replacement = makeEvent("pool_loaded", { stage: "v2" });

    const result = mergeStreamEvents(existing, replacement);

    expect(result).toHaveLength(1);
    expect(result[0].data).toEqual({ stage: "v2" });
    expect(result[0]).toBe(replacement);
  });

  it("should_stay_bounded_when_the_backend_replays_every_stage", () => {
    const stages: FastReportEvent["name"][] = [
      "snapshot",
      "pool_loaded",
      "compliance_complete",
      "contact_discovery_complete",
      "activity_complete",
      "ranking_complete",
      "report_finalized",
    ];

    // First pass: accumulate all distinct stages.
    let events: FastReportEvent[] = [];
    for (const stage of stages) {
      events = mergeStreamEvents(events, makeEvent(stage));
    }
    expect(events).toHaveLength(stages.length);

    // Reconnect replay: the same stages stream again — array must not grow.
    for (const stage of stages) {
      events = mergeStreamEvents(events, makeEvent(stage, { replayed: true }));
    }

    expect(events).toHaveLength(stages.length);
    expect(events.map((e) => e.name)).toEqual(stages);
    expect(events.every((e) => e.data.replayed === true)).toBe(true);
  });
});

describe("mergeStreamEvents with contact_discovery_progress", () => {
  it("should_dedupe_repeated_progress_events_to_one_entry_holding_the_latest_payload", () => {
    const existing = [
      makeEvent("snapshot"),
      makeEvent("pool_loaded"),
      makeEvent("contact_discovery_progress", { done: 1, total: 5 }),
    ];
    const next = makeEvent("contact_discovery_progress", { done: 3, total: 5 });

    const result = mergeStreamEvents(existing, next);

    // No growth — the progress event is replaced in place, not appended.
    expect(result).toHaveLength(3);
    // First-seen position preserved (PIPE-08 / P1-2 AC6).
    expect(result.map((e) => e.name)).toEqual([
      "snapshot",
      "pool_loaded",
      "contact_discovery_progress",
    ]);
    expect(result[2].data.done).toBe(3);
  });
});

describe("MAX_STREAM_RETRIES", () => {
  it("should_be_a_positive_finite_reconnect_cap", () => {
    expect(MAX_STREAM_RETRIES).toBe(5);
    expect(Number.isInteger(MAX_STREAM_RETRIES)).toBe(true);
    expect(MAX_STREAM_RETRIES).toBeGreaterThan(0);
  });
});
