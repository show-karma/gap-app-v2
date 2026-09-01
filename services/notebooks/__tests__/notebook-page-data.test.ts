import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NotebookSpec } from "@/services/notebooks/notebook-spec";

/**
 * What the page loader asks for, given a spec.
 *
 * The loader's whole reason to exist is that it reads the spec FIRST and turns
 * "what does this page need" into a set. So these tests assert on the CALLS it
 * made, not on the object it returned — a loader that fetched the rollup twice
 * would return an identical shape and be twice as expensive on every render.
 */

const getNotebookKernelTierRollup = vi.fn();
const getNotebookKernelData = vi.fn();
const getNotebookIndicatorSeries = vi.fn();
const getNotebookOverview = vi.fn();

vi.mock("@/services/notebooks/notebook-kernel.query", () => ({
  getNotebookKernelTierRollup: () => getNotebookKernelTierRollup(),
  getNotebookKernelData: (range: string) => getNotebookKernelData(range),
}));
vi.mock("@/services/notebooks/notebook-indicators.query", () => ({
  getNotebookIndicatorSeries: (id: string, preset: string) =>
    getNotebookIndicatorSeries(id, preset),
}));
vi.mock("@/services/notebook-overview.service", () => ({
  getNotebookOverview: (community: string) => getNotebookOverview(community),
}));
vi.mock("server-only", () => ({}));

const ROLLUP = { windowDays: 90, columns: [], rows: [], accentBy: {}, source: {} };

function spec(sections: NotebookSpec["sections"]): NotebookSpec {
  return { version: 1, sections };
}

async function load(sections: NotebookSpec["sections"]) {
  const { getNotebookPageData } = await import("@/services/notebooks/notebook-page-data");
  return getNotebookPageData("0xfilecoin", spec(sections));
}

describe("getNotebookPageData — tier rollup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getNotebookOverview.mockResolvedValue({ stats: [], applications: [] });
    getNotebookKernelTierRollup.mockResolvedValue(ROLLUP);
  });

  it("should_not_fetch_the_rollup_for_a_page_that_does_not_ask_for_one", async () => {
    const data = await load([{ type: "applications" }]);

    expect(getNotebookKernelTierRollup).not.toHaveBeenCalled();
    expect(data.tierRollup).toBeUndefined();
  });

  it("should_fetch_the_rollup_once_for_a_page_with_a_tiers_section", async () => {
    const data = await load([{ type: "tiers", source: "kernel", title: "Kernel tiers" }]);

    expect(getNotebookKernelTierRollup).toHaveBeenCalledTimes(1);
    expect(data.tierRollup).toEqual(ROLLUP);
  });

  // The rollup is one fixed 90-day object, so two sections naming it are one
  // fetch. A per-section fetch would ask twice for the identical bytes.
  it("should_fetch_the_rollup_once_for_two_tiers_sections", async () => {
    await load([
      { type: "tiers", source: "kernel", title: "Tiers" },
      { type: "tiers", source: "kernel", title: "Tiers again" },
    ]);

    expect(getNotebookKernelTierRollup).toHaveBeenCalledTimes(1);
  });

  // A failed rollup must not blank the page: the section says so, everything
  // else still renders. Same rule the kernel windows and series follow.
  it("should_leave_the_rollup_absent_rather_than_throwing_when_it_fails", async () => {
    getNotebookKernelTierRollup.mockRejectedValue(new Error("upstream down"));

    const data = await load([{ type: "tiers", source: "kernel", title: "Kernel tiers" }]);

    expect(data.tierRollup).toBeUndefined();
    expect(data.overview).toBeDefined();
  });
});
