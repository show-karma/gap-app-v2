import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NotebookMetricCatalog } from "@/services/notebooks/notebook-metric-registry.types";

/**
 * The metric query route's catalogue guard.
 *
 * The route is open, and that is deliberate — the metrics are already public.
 * What it must not be is a cache-key generator: every distinct request shape
 * is a distinct key, so an unbounded request is an unbounded number of cold
 * upstream fetches through our own cache.
 *
 * So each test below asserts the same property from a different angle: a
 * request the catalogue does not offer NEVER reaches the query service. The
 * assertion is on `queryNotebookMetric` not having been called, not merely on
 * the status code — a route that returned 400 after fetching would look
 * identical from outside and be exactly as expensive.
 */

const getNotebookMetricCatalog = vi.fn();
const queryNotebookMetric = vi.fn();

vi.mock("@/services/notebooks/notebook-metric-registry.query", () => ({
  getNotebookMetricCatalog: (id: string) => getNotebookMetricCatalog(id),
  queryNotebookMetric: (input: unknown) => queryNotebookMetric(input),
}));
vi.mock("@/utilities/community-flags", () => ({
  NOTEBOOKS_ENABLED_COMMUNITIES: ["filecoin"],
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const CATALOG: NotebookMetricCatalog = {
  community: { requested: "filecoin", slug: "filecoin", variantUIDs: ["0xf11ec01a"] },
  items: [
    {
      id: "funding.disbursed",
      label: "Disbursed",
      description: "Funds paid out.",
      entity: "funding",
      measure: "disbursed",
      valueKind: "currency",
      unit: "USDC",
      dimensions: ["none", "program"],
      filters: [
        {
          id: "programIds",
          label: "Programs",
          kind: "multi-select",
          required: false,
          optionsSource: "programs",
        },
      ],
      windows: { allowed: ["90d", "all"], default: "90d" },
      source: { tool: "gap", endpoints: ["/v2/x"], methodology: "Sum of payouts." },
    },
  ],
  options: {
    programs: [{ id: "prog-1", label: "Program One", type: null, chainID: null }],
    aggregations: ["sum"],
    kernelTiers: ["essential"],
  },
  freshness: { stale: false },
};

function request(body: unknown): Request {
  return new Request("http://localhost/api/notebooks/metrics/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID = {
  communityId: "filecoin",
  metricId: "funding.disbursed",
  groupBy: "program",
  window: "90d",
};

async function post(body: unknown) {
  const { POST } = await import("@/app/api/notebooks/metrics/query/route");
  // The route's NextRequest usage is limited to `json()` and header reads,
  // both of which a plain Request satisfies.
  const response = await POST(request(body) as never);
  return { status: response.status, body: await response.json() };
}

describe("POST /api/notebooks/metrics/query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getNotebookMetricCatalog.mockResolvedValue(CATALOG);
    queryNotebookMetric.mockResolvedValue({ rows: [], columns: [], meta: {}, query: {} });
  });

  it("should_run_a_query_the_catalogue_offers", async () => {
    const { status, body } = await post(VALID);

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(queryNotebookMetric).toHaveBeenCalledTimes(1);
  });

  describe("refusals, none of which may reach the query service", () => {
    it.each([
      ["a metric not in the catalogue", { ...VALID, metricId: "funding.invented" }],
      ["a grouping the metric does not offer", { ...VALID, groupBy: "date" }],
      ["a window the metric does not allow", { ...VALID, window: "30d" }],
      ["a filter the metric does not define", { ...VALID, filters: { tier: ["essential"] } }],
      [
        "a program the community does not list",
        { ...VALID, filters: { programIds: ["prog-elsewhere"] } },
      ],
    ])("should_refuse_%s", async (_label, body) => {
      const result = await post(body);

      expect(result.status).toBe(400);
      expect(queryNotebookMetric).not.toHaveBeenCalled();
    });

    it("should_refuse_a_community_without_notebooks_before_loading_a_catalogue", async () => {
      const result = await post({ ...VALID, communityId: "somewhere-else" });

      expect(result.status).toBe(404);
      expect(getNotebookMetricCatalog).not.toHaveBeenCalled();
      expect(queryNotebookMetric).not.toHaveBeenCalled();
    });

    it("should_refuse_an_unknown_field_rather_than_forwarding_it", async () => {
      const result = await post({ ...VALID, limit: 1000 });

      expect(result.status).toBe(400);
      expect(queryNotebookMetric).not.toHaveBeenCalled();
    });
  });

  // Each refusal names the specific thing that was wrong: "not in this
  // community's catalogue" and "not a grouping this metric offers" send an
  // author to different places.
  it("should_say_which_thing_was_not_offerable", async () => {
    const grouping = await post({ ...VALID, groupBy: "date" });
    const metric = await post({ ...VALID, metricId: "funding.invented" });

    expect(grouping.body.error).toMatch(/grouping/i);
    expect(metric.body.error).toMatch(/catalogue/i);
    expect(grouping.body.error).not.toEqual(metric.body.error);
  });

  it("should_answer_502_when_an_offerable_query_fails_upstream", async () => {
    queryNotebookMetric.mockRejectedValue(new Error("upstream down"));

    const result = await post(VALID);

    // Not a 4xx: the request was fine, so blaming the caller would send an
    // author hunting for a mistake they did not make.
    expect(result.status).toBe(502);
  });
});
