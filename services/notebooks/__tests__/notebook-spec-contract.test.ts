import { describe, expect, it } from "vitest";
import { NOTEBOOK_TIME_RANGE_PRESETS } from "@/services/notebooks/notebook-indicators.types";
import {
  NOTEBOOK_KERNEL_KPI_IDS,
  NOTEBOOK_KERNEL_WINDOW_PRESETS,
} from "@/services/notebooks/notebook-kernel.types";
import {
  NOTEBOOK_DATE_RANGES,
  NOTEBOOK_DATE_RANGES_BY_SOURCE,
  NOTEBOOK_KPI_METRICS,
} from "@/services/notebooks/notebook-spec";

/**
 * Where the spec vocabulary meets the query layer.
 *
 * These are two independently-owned modules that have to agree: the spec is
 * what gets PERSISTED and validated server-side, the query layer is what
 * FETCHES against those choices. Nothing in the type system connects them —
 * a preset renamed on one side and not the other compiles perfectly and fails
 * only at runtime, on a published page, as an empty chart.
 *
 * So the agreement is asserted here instead. A failure means the two sides
 * drifted; the fix is to reconcile them deliberately, not to relax the test.
 */

describe("date-range presets", () => {
  // Compared as SETS, not as lists: the spec's order is the order the composer
  // offers them in, and the query layer has no reason to care about that.
  // What must match is which tokens are legal, because the spec's enum is what
  // rejects a write and the query layer is what has to honour one.
  it("agree between the persisted vocabulary and the query layer", () => {
    expect([...NOTEBOOK_DATE_RANGES].sort()).toEqual([...NOTEBOOK_TIME_RANGE_PRESETS].sort());
  });

  // Per SOURCE, because the two sources mean different things by a window: an
  // indicator series has dated points so "all time" is real, while the kernel
  // API computes over a windowDays and cannot express an unwindowed reading.
  it("agree per source with the indicator presets", () => {
    expect([...NOTEBOOK_DATE_RANGES_BY_SOURCE.indicators].sort()).toEqual(
      [...NOTEBOOK_TIME_RANGE_PRESETS].sort()
    );
  });

  it("agree per source with the kernel window presets", () => {
    expect([...NOTEBOOK_DATE_RANGES_BY_SOURCE.kernel].sort()).toEqual(
      [...NOTEBOOK_KERNEL_WINDOW_PRESETS].sort()
    );
  });

  // The asymmetry is the point, so assert it rather than let a future tidy-up
  // "simplify" the two lists back into one.
  it("do not offer an all-time window for kernel data", () => {
    expect(NOTEBOOK_DATE_RANGES_BY_SOURCE.kernel).not.toContain("all");
  });

  // `all` has to exist on the spec side specifically: it is the default a
  // section falls back to when an author has not chosen, and indicator series
  // are sparse enough that a windowed default would render healthy metrics as
  // empty charts.
  it("include an all-time window", () => {
    expect(NOTEBOOK_DATE_RANGES).toContain("all");
  });
});

describe("kernel KPI ids", () => {
  // NOT yet merged into the spec's KPI enum — the kernel KPI section is a
  // later increment. This pins the ids the query layer publishes so that when
  // the enum widens, it widens to exactly these and not to names invented at
  // the call site. If the query layer renames one, this fails and the rename
  // has to be a decision rather than an accident.
  it("are the five the query layer publishes", () => {
    expect([...NOTEBOOK_KERNEL_KPI_IDS]).toEqual([
      "kernelFunctionsInScope",
      "kernelFunctionsMeasured",
      "kernelSlaMet",
      "kernelCoverage",
      "kernelProjectsReporting",
    ]);
  });

  it("do not collide with the funding KPI metrics already in the spec", () => {
    const overlap = (NOTEBOOK_KERNEL_KPI_IDS as readonly string[]).filter((id) =>
      (NOTEBOOK_KPI_METRICS as readonly string[]).includes(id)
    );

    expect(overlap).toEqual([]);
  });
});
