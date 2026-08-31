vi.mock("next/cache", () => ({
  unstable_cache: (loader: () => unknown) => loader,
}));

vi.mock("@/utilities/api/client", () => ({
  api: {
    get: vi.fn(),
  },
}));

import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";
import {
  type NotebookKernelFunctionsDto,
  NotebookKernelFunctionsDtoSchema,
  type NotebookKernelOverviewDto,
  NotebookKernelOverviewDtoSchema,
} from "../notebook-kernel.dto";
import { getNotebookKernelData } from "../notebook-kernel.query";
import { NOTEBOOK_KERNEL_INVENTORY_COLUMNS } from "../notebook-kernel.types";

const mockApiGet = api.get as unknown as ReturnType<typeof vi.fn>;

function makeOverview(): NotebookKernelOverviewDto {
  return {
    windowDays: 90,
    scored: true,
    program: {
      committedUsd: 2_132_267,
      disbursedUsd: 0,
      fundedGrants: 14,
      functionsInScope: 2,
      functionsMeasured: 1,
      measurementCoveragePct: 50,
      unmeasuredInScope: 1,
      healthMet: { scored: 4, passed: 3, metPct: 75 },
      coverage: { received: 8, expected: 10, pct: 80 },
      singleMaintainerCritical: 1,
      projectsReporting: 3,
    },
    tiers: [
      {
        tier: "irreplaceable",
        description: "Only provider",
        fundingPosture: "Must fund",
        catalogued: 1,
        inScope: 1,
        measured: 1,
        commitments: 2,
        projects: 1,
        readings: 5,
        lastReadingAt: "2026-08-25T00:00:00Z",
        sla: { scored: 4, passed: 3, metPct: 75 },
        coverage: { received: 8, expected: 10, pct: 80 },
      },
      {
        tier: "essential",
        description: "Alternatives exist",
        fundingPosture: "Fund redundancy",
        catalogued: 1,
        inScope: 1,
        measured: 0,
        commitments: 0,
        projects: 0,
        readings: 0,
        lastReadingAt: null,
        sla: { scored: 0, passed: 0, metPct: null },
        coverage: { received: 0, expected: 0, pct: null },
      },
      {
        tier: "important",
        description: "Load-bearing",
        fundingPosture: "Fund maintenance",
        catalogued: 0,
        inScope: 0,
        measured: 0,
        commitments: 0,
        projects: 0,
        readings: 0,
        lastReadingAt: null,
        sla: { scored: 0, passed: 0, metPct: null },
        coverage: { received: 0, expected: 0, pct: null },
      },
      {
        tier: "nice-to-have",
        description: "Discretionary",
        fundingPosture: "Optional",
        catalogued: 0,
        inScope: 0,
        measured: 0,
        commitments: 0,
        projects: 0,
        readings: 0,
        lastReadingAt: null,
        sla: { scored: 0, passed: 0, metPct: null },
        coverage: { received: 0, expected: 0, pct: null },
      },
    ],
  };
}

function makeFunctions(): NotebookKernelFunctionsDto {
  return {
    windowDays: 90,
    functions: [
      {
        kernelId: "chain-sync-state",
        kernelFunction: "Chain sync state",
        tier: "irreplaceable",
        category: "Node",
        subCategory: "Sync",
        kernelValue: "Keeps nodes current",
        isInScope: true,
        maintainers: 1,
        measured: true,
        commitments: 2,
        projectsReporting: 1,
        readings: 5,
        lastReadingAt: "2026-08-25T00:00:00Z",
        sla: { scored: 4, passed: 3, metPct: 75 },
        coverage: { received: 8, expected: 10, pct: 80 },
        collectingSince: "2026-08-01T00:00:00Z",
      },
      {
        kernelId: "randomness",
        kernelFunction: "Randomness",
        tier: "essential",
        category: "Protocol",
        subCategory: "Beacon",
        kernelValue: "Supplies randomness",
        isInScope: true,
        maintainers: 2,
        measured: false,
        commitments: 0,
        projectsReporting: 0,
        readings: 0,
        lastReadingAt: null,
        sla: { scored: 0, passed: 0, metPct: null },
        coverage: { received: 0, expected: 0, pct: null },
        collectingSince: null,
      },
    ],
  };
}

describe("getNotebookKernelData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches the overview and inventory concurrently for the chosen bounded window", async () => {
    let resolveOverview: (value: NotebookKernelOverviewDto) => void = () => undefined;
    let resolveFunctions: (value: NotebookKernelFunctionsDto) => void = () => undefined;
    mockApiGet
      .mockReturnValueOnce(
        new Promise<NotebookKernelOverviewDto>((resolve) => {
          resolveOverview = resolve;
        })
      )
      .mockReturnValueOnce(
        new Promise<NotebookKernelFunctionsDto>((resolve) => {
          resolveFunctions = resolve;
        })
      );

    const resultPromise = getNotebookKernelData("90d");

    expect(mockApiGet).toHaveBeenCalledTimes(2);
    expect(mockApiGet).toHaveBeenNthCalledWith(1, INDEXER.V2.KERNEL.OVERVIEW(90), {
      schema: NotebookKernelOverviewDtoSchema,
      isAuthorized: false,
    });
    expect(mockApiGet).toHaveBeenNthCalledWith(2, INDEXER.V2.KERNEL.FUNCTIONS(90), {
      schema: NotebookKernelFunctionsDtoSchema,
      isAuthorized: false,
    });

    resolveOverview(makeOverview());
    resolveFunctions(makeFunctions());
    await expect(resultPromise).resolves.toMatchObject({ preset: "90d", windowDays: 90 });
  });

  it("returns canonical KPI definitions without averaging percentages", async () => {
    mockApiGet.mockResolvedValueOnce(makeOverview()).mockResolvedValueOnce(makeFunctions());

    const result = await getNotebookKernelData("90d");

    expect(result.kpis).toEqual([
      {
        id: "kernelFunctionsInScope",
        label: "Functions in scope",
        value: 2,
        format: "count",
      },
      {
        id: "kernelFunctionsMeasured",
        label: "Functions measured",
        value: 1,
        format: "count",
        numerator: 1,
        denominator: 2,
        hint: "50% of in-scope functions",
      },
      {
        id: "kernelSlaMet",
        label: "SLA met",
        value: 75,
        format: "percent",
        numerator: 3,
        denominator: 4,
        hint: "3 of 4 scored readings passed",
      },
      {
        id: "kernelCoverage",
        label: "Collection coverage",
        value: 80,
        format: "percent",
        numerator: 8,
        denominator: 10,
        hint: "8 of 10 expected periods received",
      },
      {
        id: "kernelProjectsReporting",
        label: "Projects reporting",
        value: 3,
        format: "count",
      },
    ]);
  });

  it("preserves an unscored SLA as null instead of inventing zero percent", async () => {
    const overview = makeOverview();
    overview.scored = false;
    overview.program.healthMet = { scored: 0, passed: 0, metPct: null };
    mockApiGet.mockResolvedValueOnce(overview).mockResolvedValueOnce(makeFunctions());

    const result = await getNotebookKernelData();

    expect(result.kpis.find((kpi) => kpi.id === "kernelSlaMet")).toMatchObject({
      value: null,
      numerator: 0,
      denominator: 0,
      hint: "No readings have a published SLA threshold",
    });
  });

  it("declares the inventory columns and returns only their chart-ready row fields", async () => {
    mockApiGet.mockResolvedValueOnce(makeOverview()).mockResolvedValueOnce(makeFunctions());

    const result = await getNotebookKernelData();

    expect(result.inventory.columns).toEqual(NOTEBOOK_KERNEL_INVENTORY_COLUMNS);
    expect(result.inventory.rows[0]).toEqual({
      id: "chain-sync-state",
      function: "Chain sync state",
      tier: "irreplaceable",
      category: "Node",
      subcategory: "Sync",
      inScope: true,
      maintainers: 1,
      measured: true,
      commitments: 2,
      projectsReporting: 1,
      readings: 5,
      lastReadingAt: "2026-08-25T00:00:00Z",
      slaMetPct: 75,
      coveragePct: 80,
    });
  });

  it("fails when the two authoritative endpoints disagree on their window or rollup", async () => {
    const wrongWindow = makeFunctions();
    wrongWindow.windowDays = 30;
    mockApiGet.mockResolvedValueOnce(makeOverview()).mockResolvedValueOnce(wrongWindow);
    await expect(getNotebookKernelData()).rejects.toThrow("window");

    vi.clearAllMocks();
    const wrongRollup = makeOverview();
    wrongRollup.program.functionsMeasured = 2;
    wrongRollup.program.measurementCoveragePct = 100;
    mockApiGet.mockResolvedValueOnce(wrongRollup).mockResolvedValueOnce(makeFunctions());
    await expect(getNotebookKernelData()).rejects.toThrow("measured");
  });

  it("fails when an API percentage disagrees with its numerator and denominator", async () => {
    const overview = makeOverview();
    overview.program.healthMet.metPct = 74;
    mockApiGet.mockResolvedValueOnce(overview).mockResolvedValueOnce(makeFunctions());

    await expect(getNotebookKernelData()).rejects.toThrow("program SLA");

    vi.clearAllMocks();
    const zeroDenominator = makeOverview();
    zeroDenominator.program.coverage = { received: 0, expected: 0, pct: 0 };
    mockApiGet.mockResolvedValueOnce(zeroDenominator).mockResolvedValueOnce(makeFunctions());

    await expect(getNotebookKernelData()).rejects.toThrow("expected null percentage");
  });
});

describe("kernel wire schemas", () => {
  it("rejects impossible ratios", () => {
    const overview = makeOverview();
    overview.program.coverage = { received: 11, expected: 10, pct: 110 };

    expect(NotebookKernelOverviewDtoSchema.safeParse(overview).success).toBe(false);
  });

  it("rejects incomplete score semantics and repeated catalog identities", () => {
    const missingPercentage = makeOverview();
    missingPercentage.program.healthMet.metPct = null;
    expect(NotebookKernelOverviewDtoSchema.safeParse(missingPercentage).success).toBe(false);

    const scoredFlagMismatch = makeOverview();
    scoredFlagMismatch.scored = false;
    expect(NotebookKernelOverviewDtoSchema.safeParse(scoredFlagMismatch).success).toBe(false);

    const duplicateTiers = makeOverview();
    duplicateTiers.tiers[3] = { ...duplicateTiers.tiers[2] };
    expect(NotebookKernelOverviewDtoSchema.safeParse(duplicateTiers).success).toBe(false);

    const duplicateFunctions = makeFunctions();
    duplicateFunctions.functions[1] = { ...duplicateFunctions.functions[0] };
    expect(NotebookKernelFunctionsDtoSchema.safeParse(duplicateFunctions).success).toBe(false);
  });
});
