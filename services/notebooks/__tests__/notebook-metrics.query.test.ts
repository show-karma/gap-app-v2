vi.mock("@/utilities/api/client", () => ({
  api: {
    get: vi.fn(),
  },
}));

import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";
import {
  type NotebookCommunityMetricsDto,
  NotebookCommunityMetricsDtoSchema,
  type NotebookCommunityStatsDto,
  NotebookCommunityStatsDtoSchema,
} from "../notebook-metrics.dto";
import { getNotebookMetrics } from "../notebook-metrics.query";

const mockApiGet = api.get as unknown as ReturnType<typeof vi.fn>;

function makeCommunityMetrics(): NotebookCommunityMetricsDto {
  return {
    communityUID: "0xfilecoin",
    totalPrograms: 3,
    enabledPrograms: 2,
    totalApplications: 9,
    approvedApplications: 2,
    rejectedApplications: 0,
    pendingApplications: 4,
    underReviewApplications: 3,
    funding: {
      programs: [
        {
          programId: "small",
          programName: "Small program",
          primaryCurrency: "USDC",
          totalAllocated: 1_000,
          totalDisbursed: 500,
          totalRemaining: 500,
          projectCount: 1,
          avgMilestoneCompletion: 50,
        },
        {
          programId: "large",
          programName: "Large program",
          primaryCurrency: "USDC",
          totalAllocated: 4_000,
          totalDisbursed: 1_000,
          totalRemaining: 3_000,
          projectCount: 2,
          avgMilestoneCompletion: 25,
        },
      ],
      byTrack: [
        {
          trackId: null,
          track: null,
          allocated: 1_000,
          disbursed: 500,
          projects: 1,
          avgMilestoneCompletion: 50,
        },
        {
          trackId: "kernel",
          track: "Kernel",
          allocated: 2_000,
          disbursed: 1_000,
          projects: 2,
          avgMilestoneCompletion: 25,
        },
        {
          trackId: "revenue",
          track: "Revenue Development",
          allocated: 2_000,
          disbursed: 1_000,
          projects: 1,
          avgMilestoneCompletion: 100,
        },
        {
          trackId: "empty",
          track: "No milestones yet",
          allocated: 0,
          disbursed: 0,
          projects: 0,
          avgMilestoneCompletion: null,
        },
      ],
      totals: {
        allocated: 5_000,
        disbursed: 1_500,
        remaining: 3_500,
        programs: 2,
        distinctProjects: 47,
        avgMilestoneCompletion: 52.7,
        currencies: ["USDC"],
      },
    },
  };
}

function makeCommunityStats(): NotebookCommunityStatsDto {
  return {
    totalProjects: 48,
    totalMilestones: 197,
    projectUpdatesBreakdown: {
      projectCompletedMilestones: 0,
      grantCompletedMilestones: 102,
    },
  };
}

function resolveWireResponses(
  metrics: NotebookCommunityMetricsDto = makeCommunityMetrics(),
  stats: NotebookCommunityStatsDto = makeCommunityStats()
): void {
  mockApiGet.mockResolvedValueOnce(metrics).mockResolvedValueOnce(stats);
}

describe("getNotebookMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches both public canonical sources with runtime schemas", async () => {
    resolveWireResponses();

    await getNotebookMetrics("filecoin");

    expect(mockApiGet).toHaveBeenNthCalledWith(
      1,
      INDEXER.V2.COMMUNITY_PROGRAM_METRICS("filecoin"),
      { schema: NotebookCommunityMetricsDtoSchema, isAuthorized: false }
    );
    expect(mockApiGet).toHaveBeenNthCalledWith(2, INDEXER.COMMUNITY.V2.STATS("filecoin"), {
      schema: NotebookCommunityStatsDtoSchema,
      isAuthorized: false,
    });
  });

  it("starts the two independent reads concurrently", async () => {
    let resolveMetrics: (metrics: NotebookCommunityMetricsDto) => void = () => undefined;
    let resolveStats: (stats: NotebookCommunityStatsDto) => void = () => undefined;
    const metricsPromise = new Promise<NotebookCommunityMetricsDto>((resolve) => {
      resolveMetrics = resolve;
    });
    const statsPromise = new Promise<NotebookCommunityStatsDto>((resolve) => {
      resolveStats = resolve;
    });
    mockApiGet.mockReturnValueOnce(metricsPromise).mockReturnValueOnce(statsPromise);

    const resultPromise = getNotebookMetrics("filecoin");

    expect(mockApiGet).toHaveBeenCalledTimes(2);
    resolveMetrics(makeCommunityMetrics());
    resolveStats(makeCommunityStats());
    await expect(resultPromise).resolves.toMatchObject({ currency: "USDC" });
  });

  it("returns only the chart-ready contract", async () => {
    resolveWireResponses();

    const result = await getNotebookMetrics("filecoin");

    expect(Object.keys(result).sort()).toEqual(
      ["applications", "completion", "currency", "funding", "stats"].sort()
    );
    expect(result.currency).toBe("USDC");
  });

  it("uses canonical community stats instead of the conflicting metrics rollup", async () => {
    resolveWireResponses();

    const result = await getNotebookMetrics("filecoin");

    expect(result.stats).toEqual([
      { label: "Committed", value: 5_000, format: "currency" },
      {
        label: "Disbursed",
        value: 1_500,
        format: "currency",
        hint: "$4K still to pay out",
      },
      { label: "Funded projects", value: 48, format: "count" },
      {
        label: "Milestone completion",
        value: 52,
        format: "percent",
        hint: "102 of 197; cancelled excluded",
      },
    ]);
  });

  it("rounds milestone completion exactly like the existing community header", async () => {
    resolveWireResponses(makeCommunityMetrics(), {
      totalProjects: 2,
      totalMilestones: 3,
      projectUpdatesBreakdown: {
        projectCompletedMilestones: 1,
        grantCompletedMilestones: 1,
      },
    });

    const result = await getNotebookMetrics("filecoin");

    expect(result.stats.find((stat) => stat.label === "Milestone completion")?.value).toBe(67);
  });

  it("gives every funding row the largest program allocation as its total", async () => {
    resolveWireResponses();

    const result = await getNotebookMetrics("filecoin");

    expect(result.funding).toEqual([
      {
        label: "Large program",
        value: 1_000,
        total: 4_000,
        caption: "$1K of $4K",
        meta: "2 projects",
      },
      {
        label: "Small program",
        value: 500,
        total: 4_000,
        caption: "$500 of $1K",
        meta: "1 project",
      },
    ]);
  });

  it("drops unassigned and null-completion tracks and sorts the rest by completion", async () => {
    resolveWireResponses();

    const result = await getNotebookMetrics("filecoin");

    expect(result.completion).toEqual([
      {
        label: "Revenue Development",
        value: 100,
        total: 100,
        caption: "100.0%",
        meta: "1 project",
      },
      {
        label: "Kernel",
        value: 25,
        total: 100,
        caption: "25.0%",
        meta: "2 projects",
      },
    ]);
  });

  it("combines pending with under-review applications and omits zero buckets", async () => {
    resolveWireResponses();

    const result = await getNotebookMetrics("filecoin");

    expect(result.applications).toEqual([
      { label: "Approved", value: 2 },
      { label: "Under review", value: 7 },
    ]);
  });

  it("rejects mixed or missing currencies instead of publishing a misleading sum", async () => {
    const metrics = makeCommunityMetrics();
    metrics.funding.totals.currencies = ["USDC", "FIL"];
    resolveWireResponses(metrics);

    await expect(getNotebookMetrics("filecoin")).rejects.toThrow("require exactly one currency");
  });

  it("rejects an unsafe community id before making a request", async () => {
    await expect(getNotebookMetrics("../filecoin")).rejects.toThrow("invalid community id");
    expect(mockApiGet).not.toHaveBeenCalled();
  });
});

describe("notebook metric wire schemas", () => {
  it("accepts the live contract and tolerates additive fields", () => {
    expect(
      NotebookCommunityMetricsDtoSchema.safeParse({
        ...makeCommunityMetrics(),
        futureField: true,
      }).success
    ).toBe(true);
  });

  it("rejects a response without the required funding rollup", () => {
    const { funding: _funding, ...withoutFunding } = makeCommunityMetrics();

    expect(NotebookCommunityMetricsDtoSchema.safeParse(withoutFunding).success).toBe(false);
  });

  it("rejects impossible milestone counts", () => {
    expect(
      NotebookCommunityStatsDtoSchema.safeParse({
        totalProjects: 1,
        totalMilestones: 1,
        projectUpdatesBreakdown: {
          projectCompletedMilestones: 1,
          grantCompletedMilestones: 1,
        },
      }).success
    ).toBe(false);
  });
});
