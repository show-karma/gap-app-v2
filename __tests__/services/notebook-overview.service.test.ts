vi.mock("@/services/notebooks/notebook-metrics.query", () => ({
  getNotebookMetrics: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
// unstable_cache would memoise across cases and hide the FR5 behaviour under
// test; here it is a pass-through so each call exercises the real load path.
vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

import * as Sentry from "@sentry/nextjs";
import {
  __resetLastGoodOverview,
  getNotebookOverview,
  notebookOverviewTag,
} from "@/services/notebook-overview.service";
import { getNotebookMetrics } from "@/services/notebooks/notebook-metrics.query";

const mockGet = getNotebookMetrics as unknown as ReturnType<typeof vi.fn>;

function makeMetrics() {
  return {
    currency: "USDC",
    stats: [
      { label: "Committed", value: 9246697, format: "currency" as const },
      { label: "Disbursed", value: 6369766, format: "currency" as const },
      { label: "Funded projects", value: 48, format: "count" as const },
      { label: "Milestone completion", value: 52, format: "percent" as const },
    ],
    funding: [
      { label: "Batch 3", value: 0, total: 2168267, caption: "$0 of $2.2M", meta: "18 projects" },
    ],
    completion: [{ label: "Kernel", value: 1.3, total: 100, caption: "1.3%", meta: "13 projects" }],
    applications: [{ label: "Approved", value: 52 }],
  };
}

describe("getNotebookOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetLastGoodOverview();
  });

  it("returns the mapped overview on success", async () => {
    mockGet.mockResolvedValue(makeMetrics());

    const overview = await getNotebookOverview("filecoin");

    expect(overview.stale).toBe(false);
    expect(overview.source).toBe("gap-api");
  });

  // FR5: a refresh failure must not blank a page that was working. The reader
  // keeps the last numbers that were correct, flagged as stale.
  it("serves the last good payload when a refresh fails", async () => {
    mockGet.mockResolvedValueOnce(makeMetrics());
    await getNotebookOverview("filecoin");

    mockGet.mockRejectedValueOnce(new Error("upstream down"));
    const overview = await getNotebookOverview("filecoin");

    expect(overview.stale).toBe(true);
    expect(overview.stats[0].value).toBe(9246697);
  });

  // A stale page looks healthy, so the failure behind it has to be reported or
  // the upstream could be down for hours unnoticed.
  it("reports the refresh failure even though it serves successfully", async () => {
    mockGet.mockResolvedValueOnce(makeMetrics());
    await getNotebookOverview("filecoin");
    mockGet.mockRejectedValueOnce(new Error("upstream down"));

    await getNotebookOverview("filecoin");

    expect(Sentry.captureException).toHaveBeenCalled();
  });

  // With nothing cached there are no numbers to show; the error boundary is
  // the honest outcome, not an empty dashboard.
  it("rethrows when the very first load fails", async () => {
    mockGet.mockRejectedValue(new Error("upstream down"));

    await expect(getNotebookOverview("filecoin")).rejects.toThrow("upstream down");
  });

  // Retention is per community: one outage must never surface a different
  // community's numbers.
  it("never serves the last good data of a different community", async () => {
    mockGet.mockResolvedValueOnce(makeMetrics());
    await getNotebookOverview("filecoin");

    mockGet.mockRejectedValueOnce(new Error("upstream down"));

    await expect(getNotebookOverview("optimism")).rejects.toThrow("upstream down");
  });
});

describe("notebookOverviewTag", () => {
  it("is per community so one ingest cannot evict every page", () => {
    expect(notebookOverviewTag("filecoin")).toBe("notebook-overview:filecoin");
    expect(notebookOverviewTag("optimism")).not.toBe(notebookOverviewTag("filecoin"));
  });

  it("is case-insensitive so slug casing cannot fork the cache", () => {
    expect(notebookOverviewTag("Filecoin")).toBe(notebookOverviewTag("filecoin"));
  });
});
