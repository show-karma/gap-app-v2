vi.mock("next/cache", () => ({
  unstable_cache: (loader: () => unknown) => loader,
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

vi.mock("@/utilities/api/client", () => ({
  api: { get: vi.fn() },
}));

import * as Sentry from "@sentry/nextjs";
import { api } from "@/utilities/api/client";
import {
  __resetNotebookMetricLastGood,
  getNotebookMetricCatalog,
  notebookMetricTag,
  queryNotebookMetric,
} from "../notebook-metric-registry.query";

const mockApiGet = api.get as unknown as ReturnType<typeof vi.fn>;

const source = {
  tool: "get_programs_details",
  endpoints: ["/v2/program-registry"],
  methodology: "Counts anchored program ids.",
  canonicalNotes: ["The API is authoritative."],
};

function catalog() {
  return {
    community: {
      requested: "filecoin",
      slug: "filecoin",
      variantUIDs: ["0xfilecoin", "0xfilecoin-op"],
    },
    items: [
      {
        id: "program.count",
        label: "Programs",
        description: "Programs in this community.",
        entity: "program",
        measure: "count",
        valueKind: "count",
        unit: null,
        dimensions: ["none", "program"],
        filters: [],
        windows: { allowed: ["all"], default: "all" },
        source,
      },
    ],
    options: { programs: [], aggregations: ["sum"], kernelTiers: [] },
  };
}

function queryResult() {
  return {
    query: {
      communityUidOrSlug: "filecoin",
      metricId: "program.count",
      groupBy: "none",
      window: "all",
      filters: { programIds: ["1013", "992"] },
      entity: "program",
      measure: "count",
    },
    columns: [
      { id: "label", label: "Label", valueKind: "text", unit: null },
      { id: "value", label: "Programs", valueKind: "count", unit: null },
    ],
    rows: [{ key: "all", label: "Programs", dimensions: {}, value: 2, displayValue: "2" }],
    meta: {
      generatedAt: "2026-09-01T12:00:00.000Z",
      window: "all",
      source,
      absenceDisplay: "—",
      warnings: ["The API is authoritative."],
    },
  };
}

describe("notebook metric registry queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetNotebookMetricLastGood();
  });

  it("loads the already community-scoped catalog from the public endpoint", async () => {
    mockApiGet.mockResolvedValue(catalog());

    const result = await getNotebookMetricCatalog("Filecoin");

    expect(mockApiGet).toHaveBeenCalledWith(
      "/v2/communities/Filecoin/notebook-metrics/catalog",
      expect.objectContaining({ isAuthorized: false })
    );
    expect(result.community.variantUIDs).toEqual(["0xfilecoin", "0xfilecoin-op"]);
    expect(result.freshness).toEqual({ stale: false });
  });

  it("uses closed canonical parameters and preserves provenance and absence display", async () => {
    mockApiGet.mockResolvedValue(queryResult());

    const result = await queryNotebookMetric({
      communityId: "filecoin",
      metricId: "program.count",
      groupBy: "none",
      window: "all",
      filters: { programIds: ["992", "1013", "992"] },
    });

    const path = mockApiGet.mock.calls[0][0] as string;
    expect(path).toContain("programIds=1013%2C992");
    expect(result.meta).toMatchObject({
      absenceDisplay: "—",
      stale: false,
      source: { methodology: "Counts anchored program ids." },
    });
  });

  it("returns the exact last-good query as stale when its refresh fails", async () => {
    mockApiGet.mockResolvedValueOnce(queryResult()).mockRejectedValueOnce(new Error("offline"));
    const input = {
      communityId: "filecoin",
      metricId: "program.count",
      groupBy: "none" as const,
      window: "all" as const,
      filters: { programIds: ["1013", "992"] },
    };

    await queryNotebookMetric(input);
    const stale = await queryNotebookMetric(input);

    expect(stale.meta.stale).toBe(true);
    expect(stale.rows[0]?.value).toBe(2);
    expect(Sentry.captureException).toHaveBeenCalledOnce();
  });

  it("keeps cache tags community-scoped and case-insensitive", () => {
    expect(notebookMetricTag("Filecoin")).toBe("notebook-metrics:filecoin");
    expect(notebookMetricTag("Filecoin")).not.toBe(notebookMetricTag("celo"));
  });
});
