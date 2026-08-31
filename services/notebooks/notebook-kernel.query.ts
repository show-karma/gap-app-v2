import "server-only";

import { unstable_cache } from "next/cache";
import pluralize from "pluralize";
import { z } from "zod";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";
import {
  type NotebookKernelFunctionDto,
  NotebookKernelFunctionsDtoSchema,
  type NotebookKernelOverviewDto,
  NotebookKernelOverviewDtoSchema,
  type NotebookKernelTierDto,
} from "./notebook-kernel.dto";
import {
  NOTEBOOK_KERNEL_INVENTORY_COLUMNS,
  NOTEBOOK_KERNEL_WINDOW_PRESETS,
  type NotebookKernelData,
  type NotebookKernelInventoryRow,
  type NotebookKernelKpi,
  type NotebookKernelTier,
  type NotebookKernelTierId,
  type NotebookKernelWindowPreset,
} from "./notebook-kernel.types";

const KernelWindowPresetSchema = z.enum(NOTEBOOK_KERNEL_WINDOW_PRESETS);
const KERNEL_WINDOW_DAYS: Readonly<Record<NotebookKernelWindowPreset, number>> = {
  "30d": 30,
  "90d": 90,
  "12m": 365,
};
const KERNEL_QUERY_SHAPE_VERSION = "v1";
const KERNEL_REVALIDATE_SECONDS = 3600;

const TIER_LABELS: Readonly<Record<NotebookKernelTierId, string>> = {
  irreplaceable: "Irreplaceable",
  essential: "Essential",
  important: "Important",
  "nice-to-have": "Nice to have",
};

function assertEqual(actual: number, expected: number, subject: string): void {
  if (actual !== expected) {
    throw new Error(`Kernel reconciliation failed for ${subject}: ${actual} !== ${expected}`);
  }
}

function assertRoundedPercentage(
  percentage: number | null,
  numerator: number,
  denominator: number,
  subject: string
): void {
  if (denominator === 0) {
    if (percentage !== null) {
      throw new Error(`Kernel reconciliation failed for ${subject}: expected null percentage`);
    }
    return;
  }

  const independentlyCalculated = (numerator / denominator) * 100;
  if (percentage === null || Math.abs(percentage - independentlyCalculated) > 0.11) {
    throw new Error(
      `Kernel reconciliation failed for ${subject}: ${String(percentage)} does not match ${numerator}/${denominator}`
    );
  }
}

function reconcileSlaAndCoverage(overview: NotebookKernelOverviewDto): void {
  const { program } = overview;
  assertRoundedPercentage(
    program.measurementCoveragePct,
    program.functionsMeasured,
    program.functionsInScope,
    "measurement coverage"
  );
  assertRoundedPercentage(
    program.healthMet.metPct,
    program.healthMet.passed,
    program.healthMet.scored,
    "program SLA"
  );
  assertRoundedPercentage(
    program.coverage.pct,
    program.coverage.received,
    program.coverage.expected,
    "program collection coverage"
  );

  for (const tier of overview.tiers) {
    assertRoundedPercentage(tier.sla.metPct, tier.sla.passed, tier.sla.scored, `${tier.tier} SLA`);
    assertRoundedPercentage(
      tier.coverage.pct,
      tier.coverage.received,
      tier.coverage.expected,
      `${tier.tier} collection coverage`
    );
  }
}

/**
 * Collection coverage over the IN-SCOPE functions only.
 *
 * The API's program rollup sums coverage across every catalogued row,
 * including the ones that are `isInScope: false`. That put two adjacent tiles
 * on different populations: "29 functions in scope" beside "679 of 707
 * expected periods", where 15 of those periods belong to functions not among
 * the 29. Both happened to round to 96.0%, so the tiles agreed by coincidence
 * — which is worse than disagreeing, because nothing signals the mismatch
 * until the out-of-scope rows drift and two tiles contradict each other on a
 * page someone is quoting.
 *
 * Aligning the population is the fix; stating the denominator on the tile is
 * what makes it checkable. A rolling percentage without its denominator is not
 * quotable.
 */
function inScopeCoverage(functions: NotebookKernelFunctionDto[]): {
  received: number;
  expected: number;
  pct: number | null;
} {
  const inScope = functions.filter((entry) => entry.isInScope);
  const received = inScope.reduce((sum, entry) => sum + entry.coverage.received, 0);
  const expected = inScope.reduce((sum, entry) => sum + entry.coverage.expected, 0);

  // No expected periods is not 0% coverage — it is nothing to measure. The
  // absent rule applies: a null renders as an em-dash, never as a zero.
  const pct = expected === 0 ? null : Math.round((received / expected) * 1000) / 10;

  return { received, expected, pct };
}

function reconcileInventory(
  overview: NotebookKernelOverviewDto,
  functions: NotebookKernelFunctionDto[]
): void {
  const inScope = functions.filter((entry) => entry.isInScope).length;
  const measuredInScope = functions.filter((entry) => entry.isInScope && entry.measured).length;

  assertEqual(inScope, overview.program.functionsInScope, "functions in scope");
  assertEqual(measuredInScope, overview.program.functionsMeasured, "functions measured in scope");
  assertEqual(
    overview.program.unmeasuredInScope,
    inScope - measuredInScope,
    "unmeasured functions in scope"
  );

  for (const tier of overview.tiers) {
    const tierFunctions = functions.filter((entry) => entry.tier === tier.tier);
    assertEqual(tierFunctions.length, tier.catalogued, `${tier.tier} catalogued functions`);
    assertEqual(
      tierFunctions.filter((entry) => entry.isInScope).length,
      tier.inScope,
      `${tier.tier} functions in scope`
    );
    assertEqual(
      tierFunctions.filter((entry) => entry.measured).length,
      tier.measured,
      `${tier.tier} measured functions`
    );
  }
}

function toKpis(
  overview: NotebookKernelOverviewDto,
  functions: NotebookKernelFunctionDto[]
): NotebookKernelKpi[] {
  const { program } = overview;
  const coverage = inScopeCoverage(functions);
  const slaHint =
    program.healthMet.scored === 0
      ? "No readings have a published SLA threshold"
      : `${program.healthMet.passed} of ${program.healthMet.scored} scored ${pluralize(
          "reading",
          program.healthMet.scored
        )} passed`;

  return [
    {
      id: "kernelFunctionsInScope",
      label: "Functions in scope",
      value: program.functionsInScope,
      format: "count",
    },
    {
      id: "kernelFunctionsMeasured",
      label: "Functions measured",
      value: program.functionsMeasured,
      format: "count",
      numerator: program.functionsMeasured,
      denominator: program.functionsInScope,
      hint:
        program.measurementCoveragePct === null
          ? "No functions are in scope"
          : `${program.measurementCoveragePct}% of in-scope functions`,
    },
    {
      id: "kernelSlaMet",
      label: "SLA met",
      value: program.healthMet.metPct,
      format: "percent",
      numerator: program.healthMet.passed,
      denominator: program.healthMet.scored,
      hint: slaHint,
    },
    {
      id: "kernelCoverage",
      label: "Collection coverage",
      // In-scope only, so this tile shares a population with "functions in
      // scope" beside it rather than agreeing with it by rounding luck.
      value: coverage.pct,
      format: "percent",
      numerator: coverage.received,
      denominator: coverage.expected,
      hint: `${coverage.received} of ${coverage.expected} expected ${pluralize(
        "period",
        coverage.expected
      )} received, across ${program.functionsInScope} in-scope ${pluralize(
        "function",
        program.functionsInScope
      )}`,
    },
    {
      id: "kernelProjectsReporting",
      label: "Projects reporting",
      value: program.projectsReporting,
      format: "count",
    },
  ];
}

function toTier(tier: NotebookKernelTierDto): NotebookKernelTier {
  return {
    id: tier.tier,
    label: TIER_LABELS[tier.tier],
    description: tier.description,
    fundingPosture: tier.fundingPosture,
    catalogued: tier.catalogued,
    inScope: tier.inScope,
    measured: tier.measured,
    commitments: tier.commitments,
    projectsReporting: tier.projects,
    readings: tier.readings,
    lastReadingAt: tier.lastReadingAt,
    sla: tier.sla,
    coverage: tier.coverage,
  };
}

function toInventoryRow(entry: NotebookKernelFunctionDto): NotebookKernelInventoryRow {
  return {
    id: entry.kernelId,
    function: entry.kernelFunction,
    tier: entry.tier,
    category: entry.category,
    subcategory: entry.subCategory,
    inScope: entry.isInScope,
    maintainers: entry.maintainers,
    measured: entry.measured,
    commitments: entry.commitments,
    projectsReporting: entry.projectsReporting,
    readings: entry.readings,
    lastReadingAt: entry.lastReadingAt,
    slaMetPct: entry.sla.metPct,
    coveragePct: entry.coverage.pct,
  };
}

async function loadKernelData(
  preset: NotebookKernelWindowPreset,
  windowDays: number
): Promise<NotebookKernelData> {
  const [overview, functionsResponse] = await Promise.all([
    api.get<NotebookKernelOverviewDto>(INDEXER.V2.KERNEL.OVERVIEW(windowDays), {
      schema: NotebookKernelOverviewDtoSchema,
      isAuthorized: false,
    }),
    api.get(INDEXER.V2.KERNEL.FUNCTIONS(windowDays), {
      schema: NotebookKernelFunctionsDtoSchema,
      isAuthorized: false,
    }),
  ]);

  if (overview.windowDays !== windowDays || functionsResponse.windowDays !== windowDays) {
    throw new Error(
      `Kernel reconciliation failed for window: requested ${windowDays}, received ${overview.windowDays}/${functionsResponse.windowDays}`
    );
  }

  reconcileSlaAndCoverage(overview);
  reconcileInventory(overview, functionsResponse.functions);

  return {
    preset,
    windowDays,
    kpis: toKpis(overview, functionsResponse.functions),
    tiers: overview.tiers.map(toTier),
    inventory: {
      columns: NOTEBOOK_KERNEL_INVENTORY_COLUMNS,
      rows: functionsResponse.functions.map(toInventoryRow),
    },
  };
}

/**
 * Filecoin Kernel KPIs, tier rollups and inventory as renderer-ready data.
 * The 90-day default is the same rolling window used by filpgf.io/kernel.
 */
export async function getNotebookKernelData(
  preset: NotebookKernelWindowPreset = "90d"
): Promise<NotebookKernelData> {
  const validatedPreset = KernelWindowPresetSchema.parse(preset);
  const windowDays = KERNEL_WINDOW_DAYS[validatedPreset];

  return unstable_cache(
    () => loadKernelData(validatedPreset, windowDays),
    ["notebook-kernel", KERNEL_QUERY_SHAPE_VERSION, validatedPreset],
    { revalidate: KERNEL_REVALIDATE_SECONDS, tags: ["notebook-kernel"] }
  )();
}
