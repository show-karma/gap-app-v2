import * as Sentry from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getNotebookMetricCatalog,
  queryNotebookMetric,
} from "@/services/notebooks/notebook-metric-registry.query";
import {
  NOTEBOOK_METRIC_AGGREGATIONS,
  NOTEBOOK_METRIC_DIMENSIONS,
  NOTEBOOK_METRIC_WINDOWS,
  type NotebookMetricCatalog,
  type NotebookMetricQueryInput,
} from "@/services/notebooks/notebook-metric-registry.types";
import { NOTEBOOKS_ENABLED_COMMUNITIES } from "@/utilities/community-flags";

/**
 * Runs one metric query for the builder's preview.
 *
 * WHY A ROUTE AT ALL. The query service is `server-only` — it holds the cache,
 * the last-good fallback and the reconciliation that makes a figure
 * trustworthy. The builder is a client component and must not get its own copy
 * of any of that, so it asks this route and the single auditable seam stays
 * single.
 *
 * WHY NO AUTH, AND WHAT REPLACES IT. The underlying metrics are already served
 * unauthenticated by gapapi, so there is nothing here to keep secret; the
 * exposure is AMPLIFICATION. Every distinct request shape is a distinct cache
 * key, so an open route with a free-form body lets anyone mint unlimited cold
 * keys and turn our cache into a load generator pointed at gapapi.
 *
 * The defence is to make the key space finite rather than to gate the caller:
 * every request is checked against the COMMUNITY'S OWN CATALOG before it can
 * reach the query service — the metric must be in it, the grouping must be one
 * the metric declares, the window must be one it allows, each filter must be
 * one it defines, and a program id must be one the catalog lists. What the
 * picker would never offer, the server refuses. That is the same rule the
 * indicator picker follows, applied from the other side.
 *
 * `projectUIDs` is therefore NOT ACCEPTED HERE AT ALL. The catalog publishes
 * no project list, so there is nothing to validate membership against, and a
 * filter bounded only by a count cap is exactly the unbounded key space this
 * route exists to prevent. The strict schema turns it into an unknown field
 * and refuses the request. Re-enable it — validated — when the catalog
 * publishes projects; until then, half a guard is worse than none, because it
 * reads like a guard.
 */

export const dynamic = "force-dynamic";

const RequestSchema = z
  .object({
    communityId: z.string().trim().min(1).max(128),
    metricId: z.string().trim().min(1).max(200),
    groupBy: z.enum(NOTEBOOK_METRIC_DIMENSIONS),
    window: z.enum(NOTEBOOK_METRIC_WINDOWS),
    filters: z
      .object({
        programIds: z.array(z.string().trim().min(1).max(200)).max(100).optional(),
        // No projectUIDs — see the note above. Its absence from this schema is
        // what refuses it, since the object is strict.
        aggregation: z.enum(NOTEBOOK_METRIC_AGGREGATIONS).optional(),
        tier: z.array(z.string().trim().min(1).max(100)).max(10).optional(),
        category: z.array(z.string().trim().min(1).max(200)).max(50).optional(),
        inScope: z.boolean().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

type QueryRequest = z.infer<typeof RequestSchema>;

/**
 * The request, checked against what the catalog actually offers.
 *
 * Returns the first reason it is not offerable, or null when it is. Each
 * message names the specific thing that was wrong: "not in this community's
 * catalogue" and "not a grouping this metric offers" send an author to
 * different places, and collapsing them into "invalid query" sends them
 * nowhere.
 */
function catalogRefusal(catalog: NotebookMetricCatalog, request: QueryRequest): string | null {
  const metric = catalog.items.find((item) => item.id === request.metricId);
  if (!metric) return "Metric is not in this community's catalogue";
  if (!metric.dimensions.includes(request.groupBy)) {
    return "Grouping is not one this metric offers";
  }
  if (!metric.windows.allowed.includes(request.window)) {
    return "Window is not one this metric allows";
  }

  const filters = request.filters ?? {};
  const declared = new Set(metric.filters.map((filter) => filter.id));
  for (const id of Object.keys(filters) as Array<keyof typeof filters>) {
    if (!declared.has(id)) return `Filter ${id} is not defined for this metric`;
  }

  // Bounding the ids, not just their count: an unbounded id is an unbounded
  // cache key, which is the whole hazard this function exists to close.
  const programs = new Set(catalog.options.programs.map((program) => program.id));
  if (filters.programIds?.some((id) => !programs.has(id))) {
    return "Program is not one this community lists";
  }
  const tiers = new Set(catalog.options.kernelTiers);
  if (filters.tier?.some((tier) => !tiers.has(tier))) {
    return "Tier is not one this community lists";
  }

  return null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let parsed: QueryRequest;
  try {
    const result = RequestSchema.safeParse(await request.json());
    if (!result.success) {
      return NextResponse.json({ ok: false, error: "Invalid query" }, { status: 400 });
    }
    parsed = result.data;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid query" }, { status: 400 });
  }

  // Only communities that actually have notebooks are addressable, so a
  // request cannot warm cache entries for a community that has no pages.
  if (!NOTEBOOKS_ENABLED_COMMUNITIES.includes(parsed.communityId)) {
    return NextResponse.json({ ok: false, error: "Unknown community" }, { status: 404 });
  }

  let catalog: NotebookMetricCatalog;
  try {
    catalog = await getNotebookMetricCatalog(parsed.communityId);
  } catch (error) {
    Sentry.captureException(error, { tags: { route: "/api/notebooks/metrics/query" } });
    return NextResponse.json({ ok: false, error: "Catalogue unavailable" }, { status: 502 });
  }

  const refusal = catalogRefusal(catalog, parsed);
  if (refusal) {
    return NextResponse.json({ ok: false, error: refusal }, { status: 400 });
  }

  try {
    const input: NotebookMetricQueryInput = parsed;
    const result = await queryNotebookMetric(input);
    return NextResponse.json({ ok: true, result }, { status: 200 });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "/api/notebooks/metrics/query" },
      extra: { communityId: parsed.communityId, metricId: parsed.metricId },
    });
    // The request was offerable and still failed, so this is ours, not the
    // caller's — a 4xx here would send an author looking for a mistake they
    // did not make.
    return NextResponse.json({ ok: false, error: "Query failed" }, { status: 502 });
  }
}
