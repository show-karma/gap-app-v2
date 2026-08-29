vi.mock("@/utilities/api/client", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
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
  type CommunityMetrics,
  getNotebookOverview,
  notebookOverviewTag,
  toOverview,
} from "@/services/notebook-overview.service";
import { api } from "@/utilities/api/client";

const mockGet = api.get as unknown as ReturnType<typeof vi.fn>;

function makeMetrics(overrides: Partial<CommunityMetrics> = {}): CommunityMetrics {
  return {
    communityUID: "0xfilecoin",
    totalPrograms: 5,
    enabledPrograms: 2,
    totalApplications: 205,
    approvedApplications: 52,
    rejectedApplications: 151,
    pendingApplications: 1,
    underReviewApplications: 1,
    funding: {
      programs: [
        {
          programId: "1039",
          programName: "Pods Track",
          primaryCurrency: "USDC",
          totalAllocated: 613630,
          totalDisbursed: 563337,
          totalRemaining: 50293,
          projectCount: 3,
          avgMilestoneCompletion: 100,
        },
        {
          programId: "1479",
          programName: "Batch 3",
          primaryCurrency: "",
          totalAllocated: 2168267,
          totalDisbursed: 0,
          totalRemaining: 2168267,
          projectCount: 18,
          avgMilestoneCompletion: 0.9,
        },
      ],
      byTrack: [
        {
          trackId: null,
          track: null,
          allocated: 7273500,
          disbursed: 5806429,
          projects: 34,
          avgMilestoneCompletion: 67.7,
        },
        {
          trackId: "t1",
          track: "Kernel",
          allocated: 1812267,
          disbursed: 0,
          projects: 13,
          avgMilestoneCompletion: 1.3,
        },
      ],
      totals: {
        allocated: 9246697,
        disbursed: 6369766,
        remaining: 2928731,
        programs: 4,
        distinctProjects: 47,
        avgMilestoneCompletion: 52.7,
        currencies: ["USDC"],
      },
    },
    ...overrides,
  } as CommunityMetrics;
}

const AT = "2026-08-29T01:00:00.000Z";

describe("toOverview", () => {
  it("puts the headline totals in the KPI tiles", () => {
    const overview = toOverview(makeMetrics(), AT);

    expect(overview.stats.map((s) => [s.label, s.value])).toEqual([
      ["Committed", 9246697],
      ["Disbursed", 6369766],
      ["Funded projects", 47],
      ["Milestone completion", 52.7],
    ]);
  });

  // Bars must be comparable BETWEEN programs, so every row is scaled against
  // the largest allocation. Scaling each row against its own total would make
  // a small fully-disbursed program look as large as a big one.
  it("scales every funding bar against the largest allocation", () => {
    const overview = toOverview(makeMetrics(), AT);

    expect(new Set(overview.funding.map((bar) => bar.total))).toEqual(new Set([2168267]));
  });

  it("orders funding bars by commitment, largest first", () => {
    const overview = toOverview(makeMetrics(), AT);

    expect(overview.funding.map((bar) => bar.label)).toEqual(["Batch 3", "Pods Track"]);
  });

  it("captions a funding bar with both figures", () => {
    const overview = toOverview(makeMetrics(), AT);

    expect(overview.funding[1].caption).toBe("$563K of $614K");
  });

  // A byTrack row with a null track is the ungrouped remainder, not a track;
  // rendering it would double-count every project under a blank label.
  it("drops the ungrouped remainder from the track bars", () => {
    const overview = toOverview(makeMetrics(), AT);

    expect(overview.completion.map((bar) => bar.label)).toEqual(["Kernel"]);
    expect(overview.completion[0].total).toBe(100);
  });

  it("folds pending into under-review and omits empty buckets", () => {
    const overview = toOverview(
      makeMetrics({ approvedApplications: 0, rejectedApplications: 0 }),
      AT
    );

    expect(overview.applications).toEqual([{ label: "Under review", value: 2 }]);
  });

  it("marks a freshly fetched payload as not stale", () => {
    expect(toOverview(makeMetrics(), AT).stale).toBe(false);
  });

  it("survives a program list with no allocations without dividing by zero", () => {
    const metrics = makeMetrics();
    metrics.funding.programs = metrics.funding.programs.map((program) => ({
      ...program,
      totalAllocated: 0,
      totalDisbursed: 0,
    }));

    const overview = toOverview(metrics, AT);

    expect(overview.funding.every((bar) => bar.total > 0)).toBe(true);
  });
});

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
