import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MetricQueryBuilder } from "@/components/Pages/Admin/Notebooks/MetricQueryBuilder";
import type {
  NotebookMetricCatalog,
  NotebookMetricQueryResult,
} from "@/services/notebooks/notebook-metric-registry.types";

/**
 * The query builder offers what the CATALOGUE declares, and nothing else.
 *
 * Every test builds its own catalogue and asserts the UI followed it. A test
 * that hard-coded "Disbursed" or "90d" here would pass against a component
 * with those baked in — which is precisely the bug worth catching, because a
 * baked-in vocabulary drifts silently from the server that validates it.
 */

function catalog(overrides: Partial<NotebookMetricCatalog> = {}): NotebookMetricCatalog {
  return {
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
          {
            id: "aggregation",
            label: "Aggregation",
            kind: "single-select",
            required: false,
            optionsSource: "aggregations",
            // Declared for the grouped view only.
            dimensions: ["program"],
          },
        ],
        windows: { allowed: ["90d", "all"], default: "90d" },
        source: { tool: "gap", endpoints: ["/v2/x"], methodology: "Sum of payouts." },
      },
    ],
    options: {
      programs: [{ id: "prog-1", label: "Program One", type: null, chainID: null }],
      aggregations: ["sum", "last"],
      kernelTiers: [],
    },
    freshness: { stale: false },
    ...overrides,
  };
}

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
      generatedAt: "2026-08-31T00:00:00.000Z",
      window: "90d",
      source: { tool: "gap", endpoints: ["/v2/x"], methodology: "Sum of payouts." },
      absenceDisplay: "—",
      warnings: [],
      stale: false,
    },
    ...overrides,
  };
}

function mockFetch(body: unknown, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({ ok, json: async () => body });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderBuilder(c: NotebookMetricCatalog = catalog()) {
  return render(<MetricQueryBuilder communityId="filecoin" catalog={c} />);
}

describe("MetricQueryBuilder", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("should_offer_the_catalogue_metrics_and_show_the_selected_description", () => {
    renderBuilder();

    expect(screen.getByLabelText("Metric")).toHaveTextContent("Disbursed");
    expect(screen.getByText("Funds paid out.")).toBeInTheDocument();
  });

  it("should_say_so_when_the_community_has_no_metrics", () => {
    renderBuilder(catalog({ items: [] }));

    expect(screen.getByText(/no metrics catalogued/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /run query/i })).not.toBeInTheDocument();
  });

  // The declared default, not a value this component picked.
  it("should_start_on_the_window_the_metric_declares_as_its_default", () => {
    renderBuilder();

    expect(screen.getByLabelText("Window")).toHaveTextContent("90d");
  });

  it("should_offer_a_filter_whose_options_the_catalogue_publishes", () => {
    renderBuilder();

    expect(screen.getByRole("checkbox", { name: "Program One" })).toBeInTheDocument();
  });

  // `projects` has no published option list. Offering an empty picker would
  // teach an author the filter exists and is broken.
  it("should_omit_a_filter_the_catalogue_publishes_no_options_for", () => {
    const withProjects = catalog();
    withProjects.items[0].filters = [
      {
        id: "projectUIDs",
        label: "Projects",
        kind: "multi-select",
        required: false,
        optionsSource: "projects",
      },
    ];

    renderBuilder(withProjects);

    expect(screen.queryByText("Projects")).not.toBeInTheDocument();
  });

  describe("running a query", () => {
    it("should_send_exactly_the_catalogue_shaped_request", async () => {
      const fetchMock = mockFetch({ ok: true, result: result() });
      renderBuilder();

      await userEvent.click(screen.getByRole("button", { name: /run query/i }));

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
        communityId: "filecoin",
        metricId: "funding.disbursed",
        groupBy: "none",
        window: "90d",
      });
    });

    // The whole point of the contract carrying `displayValue`: the preview and
    // the published page format a figure in exactly one place.
    it("should_render_the_display_value_the_query_layer_produced", async () => {
      mockFetch({ ok: true, result: result() });
      renderBuilder();

      await userEvent.click(screen.getByRole("button", { name: /run query/i }));

      expect(await screen.findByText("$1,250")).toBeInTheDocument();
    });

    it("should_render_the_declared_em_dash_for_an_absent_figure_and_never_a_zero", async () => {
      mockFetch({
        ok: true,
        result: result({
          rows: [
            {
              key: "prog-1",
              label: "Program One",
              dimensions: {},
              value: null,
              displayValue: "—",
            },
          ],
        }),
      });
      renderBuilder();

      await userEvent.click(screen.getByRole("button", { name: /run query/i }));

      expect(await screen.findByText("—")).toBeInTheDocument();
      expect(screen.queryByText("$0")).not.toBeInTheDocument();
    });

    it("should_show_the_methodology_and_endpoints_beside_the_result", async () => {
      mockFetch({ ok: true, result: result() });
      renderBuilder();

      await userEvent.click(screen.getByRole("button", { name: /run query/i }));

      expect(await screen.findByText("Sum of payouts.")).toBeInTheDocument();
      expect(screen.getByText(/\/v2\/x/)).toBeInTheDocument();
    });

    it("should_distinguish_no_rows_from_a_failure", async () => {
      mockFetch({ ok: true, result: result({ rows: [] }) });
      renderBuilder();

      await userEvent.click(screen.getByRole("button", { name: /run query/i }));

      expect(await screen.findByText(/returned no rows/i)).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    // The route says WHICH thing was not offerable; swallowing that for a
    // generic message is what makes a builder feel broken.
    it("should_surface_the_reason_the_route_refused", async () => {
      mockFetch({ ok: false, error: "Window is not one this metric allows" }, false);
      renderBuilder();

      await userEvent.click(screen.getByRole("button", { name: /run query/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Window is not one this metric allows"
      );
    });

    it("should_report_a_transport_failure_without_claiming_the_query_was_wrong", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
      renderBuilder();

      await userEvent.click(screen.getByRole("button", { name: /run query/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(/could not reach/i);
    });

    it("should_say_when_a_result_is_the_last_good_one_rather_than_live", async () => {
      mockFetch({
        ok: true,
        result: result({ meta: { ...result().meta, stale: true } }),
      });
      renderBuilder();

      await userEvent.click(screen.getByRole("button", { name: /run query/i }));

      expect(await screen.findByRole("status")).toHaveTextContent(/last good result/i);
    });
  });

  it("should_say_when_the_catalogue_itself_is_stale", () => {
    renderBuilder(catalog({ freshness: { stale: true } }));

    expect(screen.getByRole("status")).toHaveTextContent(/last catalogue/i);
  });
});
