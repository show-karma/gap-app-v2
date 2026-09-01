import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NotebookQueryTable } from "@/components/Pages/Communities/Notebooks/NotebookQueryTable";
import {
  NOTEBOOK_METRIC_AGGREGATIONS,
  NOTEBOOK_METRIC_DIMENSIONS,
  NOTEBOOK_METRIC_WINDOWS,
  type NotebookMetricQueryResult,
} from "@/services/notebooks/notebook-metric-registry.types";
import { querySectionKey } from "@/services/notebooks/notebook-page-data.types";
import {
  NOTEBOOK_QUERY_AGGREGATIONS,
  NOTEBOOK_QUERY_DIMENSIONS,
  NOTEBOOK_QUERY_WINDOWS,
  NotebookQuerySectionSchema,
} from "@/services/notebooks/notebook-spec";

function result(overrides: Partial<NotebookMetricQueryResult> = {}): NotebookMetricQueryResult {
  return {
    query: {
      communityUidOrSlug: "filecoin",
      metricId: "funding.disbursed",
      groupBy: "program",
      window: "90d",
      filters: {},
      entity: "funding",
      measure: "disbursed",
    },
    columns: [
      { id: "label", label: "Program", valueKind: "text", unit: null },
      { id: "value", label: "Disbursed", valueKind: "currency", unit: "USDC" },
    ],
    rows: [
      {
        key: "prog-1",
        label: "Program One",
        dimensions: { program: "prog-1" },
        value: 1250,
        displayValue: "$1,250",
      },
    ],
    meta: {
      generatedAt: "2026-09-01T00:00:00.000Z",
      window: "90d",
      source: { tool: "gap", endpoints: ["/v2/x"], methodology: "Sum of payouts." },
      absenceDisplay: "—",
      warnings: [],
      stale: false,
    },
    ...overrides,
  };
}

/**
 * The stored vocabulary and the registry's have to agree.
 *
 * They are declared separately on purpose — the spec describes what may be
 * PERSISTED, and a stored page must not become invalid because a service
 * constant was refactored. Separate declarations mean drift is possible, so
 * this is where it gets caught: a failure here is not a reason to relax the
 * test, it is a reason to decide deliberately what happens to pages using the
 * value that moved.
 */
describe("query vocabulary contract", () => {
  it.each([
    ["dimensions", NOTEBOOK_QUERY_DIMENSIONS, NOTEBOOK_METRIC_DIMENSIONS],
    ["windows", NOTEBOOK_QUERY_WINDOWS, NOTEBOOK_METRIC_WINDOWS],
    ["aggregations", NOTEBOOK_QUERY_AGGREGATIONS, NOTEBOOK_METRIC_AGGREGATIONS],
  ])("should_offer_the_same_%s_the_registry_does", (_label, spec, registry) => {
    expect([...spec].sort()).toEqual([...registry].sort());
  });
});

describe("NotebookQuerySectionSchema", () => {
  const valid = {
    type: "query",
    metricId: "funding.disbursed",
    groupBy: "program",
    window: "90d",
    title: "Disbursed by program",
  };

  it("should_accept_a_query_the_catalogue_could_answer", () => {
    expect(NotebookQuerySectionSchema.safeParse(valid).success).toBe(true);
  });

  // Ruled out at the schema, not merely at the picker: the catalogue publishes
  // no project list, so nothing could ever validate one, and an unvalidated id
  // is an unbounded cache key. See issue #2092.
  it("should_refuse_projectUIDs_which_nothing_can_validate", () => {
    const parsed = NotebookQuerySectionSchema.safeParse({
      ...valid,
      filters: { projectUIDs: ["0xproject"] },
    });

    expect(parsed.success).toBe(false);
  });

  it("should_refuse_a_metric_id_that_is_not_shaped_like_one", () => {
    expect(
      NotebookQuerySectionSchema.safeParse({ ...valid, metricId: "Robert'); DROP TABLE" }).success
    ).toBe(false);
  });

  it("should_refuse_a_grouping_outside_the_vocabulary", () => {
    expect(NotebookQuerySectionSchema.safeParse({ ...valid, groupBy: "everything" }).success).toBe(
      false
    );
  });
});

/**
 * Two sections asking the same question must share one key.
 *
 * The key is what makes a page fetch once instead of once per section, so a
 * key that varied with filter ORDER would silently double the work for a page
 * whose author happened to tick two programs in a different sequence.
 */
describe("querySectionKey", () => {
  it("should_key_two_orderings_of_the_same_filters_identically", () => {
    const a = querySectionKey({
      metricId: "m",
      groupBy: "program",
      window: "90d",
      filters: { programIds: ["b", "a"], inScope: true },
    });
    const b = querySectionKey({
      metricId: "m",
      groupBy: "program",
      window: "90d",
      filters: { inScope: true, programIds: ["a", "b"] },
    });

    expect(a).toBe(b);
  });

  it("should_key_a_duplicate_id_the_same_as_a_single_one", () => {
    const once = querySectionKey({
      metricId: "m",
      groupBy: "none",
      window: "90d",
      filters: { programIds: ["a"] },
    });
    const twice = querySectionKey({
      metricId: "m",
      groupBy: "none",
      window: "90d",
      filters: { programIds: ["a", "a"] },
    });

    expect(once).toBe(twice);
  });

  it.each([
    ["a different metric", { metricId: "other", groupBy: "none", window: "90d" }],
    ["a different grouping", { metricId: "m", groupBy: "program", window: "90d" }],
    ["a different window", { metricId: "m", groupBy: "none", window: "all" }],
    [
      "a different filter value",
      { metricId: "m", groupBy: "none", window: "90d", filters: { programIds: ["z"] } },
    ],
  ])("should_key_%s_differently", (_label, section) => {
    const base = querySectionKey({ metricId: "m", groupBy: "none", window: "90d" });

    expect(querySectionKey(section)).not.toBe(base);
  });
});

describe("NotebookQueryTable", () => {
  it("should_render_the_declared_columns_and_the_query_layers_display_values", () => {
    render(<NotebookQueryTable result={result()} />);

    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual([
      "Program",
      "Disbursed (USDC)",
    ]);
    expect(screen.getByText("$1,250")).toBeInTheDocument();
  });

  // The renderer never re-derives from `value`, so an absent figure arrives
  // already rendered as the em dash and cannot become a zero here.
  it("should_show_the_em_dash_the_query_layer_produced_and_never_a_zero", () => {
    render(
      <NotebookQueryTable
        result={result({
          rows: [
            {
              key: "prog-1",
              label: "Program One",
              dimensions: {},
              value: null,
              displayValue: "—",
            },
          ],
        })}
      />
    );

    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByText("$0")).not.toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("should_distinguish_no_rows_from_a_failure", () => {
    render(<NotebookQueryTable result={result({ rows: [] })} />);

    expect(screen.getByText(/no rows matched/i)).toBeInTheDocument();
  });

  it("should_state_the_methodology_and_window_beside_the_figures", () => {
    render(<NotebookQueryTable result={result()} />);

    expect(screen.getByText(/Sum of payouts\./)).toBeInTheDocument();
    expect(screen.getByText(/90d/)).toBeInTheDocument();
  });
});
