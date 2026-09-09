import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NotebookOverviewView } from "@/components/Pages/Communities/Notebooks/NotebookOverview";
import { NotebookQueryChart } from "@/components/Pages/Communities/Notebooks/NotebookQueryChart";
import type { NotebookOverview } from "@/services/notebook-overview.service";
import { NOTEBOOK_CHART_SIZE_WIDTH } from "@/services/notebooks/notebook-chart-vega";
import type { NotebookMetricQueryResult } from "@/services/notebooks/notebook-metric-registry.types";
import type { NotebookPageData } from "@/services/notebooks/notebook-page-data.types";
import { queryChartKey, querySectionKey } from "@/services/notebooks/notebook-page-data.types";
import type {
  NotebookComposedSpec,
  NotebookQuerySection,
} from "@/services/notebooks/notebook-spec";

/**
 * The one place a compiled chart is injected into the page.
 *
 * TWO THINGS ARE UNDER TEST. First, that the section falls back to its table
 * whenever there is no picture to show — no chart asked for, no SVG compiled,
 * or an SVG that fails the structural guard on the way in. The figures are
 * never lost, which is what makes "render the table" a complete answer rather
 * than a degraded one.
 *
 * Second, the accessibility contract: the SVG itself is hidden from assistive
 * technology and from the tab order, the accessible name lives on the wrapper,
 * and the numbers are reachable as a real table. A chart that announced its
 * own hundred text nodes would read as noise, and a chart with no table
 * beneath it would be a page whose figures only sighted readers can have.
 */

const SVG = '<svg viewBox="0 0 560 260"><rect x="0" y="0" width="4" height="4"></rect></svg>';

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

function querySection(overrides: Partial<NotebookQuerySection> = {}): NotebookQuerySection {
  return {
    type: "query",
    metricId: "funding.disbursed",
    groupBy: "program",
    window: "90d",
    title: "Disbursed by program",
    ...overrides,
  } as NotebookQuerySection;
}

/** The page, rendered through the real section switch rather than around it. */
function renderPage(section: NotebookQuerySection, queryCharts?: Record<string, string | null>) {
  const spec: NotebookComposedSpec = { version: 1, sections: [section] } as NotebookComposedSpec;
  const data: NotebookPageData = {
    overview: {} as NotebookOverview,
    kernel: {},
    series: {},
    queries: { [querySectionKey(section)]: result() },
    ...(queryCharts ? { queryCharts } : {}),
  };
  return render(<NotebookOverviewView overview={{} as NotebookOverview} spec={spec} data={data} />);
}

describe("NotebookQueryChart", () => {
  it("should_name_the_picture_on_a_wrapper_rather_than_on_the_svg", () => {
    render(
      <NotebookQueryChart
        svg={SVG}
        section={querySection({ chart: { mark: "bar" } })}
        result={result()}
      />
    );

    const figure = screen.getByRole("img");
    expect(figure).toHaveAttribute("aria-label", expect.stringContaining("Disbursed by program"));
    expect(figure.getAttribute("aria-label")).toContain("bar chart");
  });

  // The picture is decoration: everything it says is said again in the table
  // below it, so announcing its text nodes would repeat the whole section.
  it("should_hide_the_svg_from_assistive_technology_and_the_tab_order", () => {
    const { container } = render(
      <NotebookQueryChart
        svg={SVG}
        section={querySection({ chart: { mark: "bar" } })}
        result={result()}
      />
    );

    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
  });

  // The viewBox is what makes a cached, fixed-size compile scale to whatever
  // column the reader's page gives it. Dropping it would pin every chart to
  // the width it happened to be compiled at.
  it("should_keep_the_viewBox_so_the_compiled_picture_scales", () => {
    const { container } = render(
      <NotebookQueryChart
        svg={SVG}
        section={querySection({ chart: { mark: "bar" } })}
        result={result()}
      />
    );

    expect(container.querySelector("svg")).toHaveAttribute("viewBox", "0 0 560 260");
  });

  // Even when the raw SVG carried an intrinsic size and no aria contract, the
  // component normalises it: the injection point is the last place the promise
  // can be kept, and it is kept here rather than assumed of the caller.
  it("should_normalise_a_root_that_still_carries_its_compiled_size", () => {
    const raw = '<svg width="560" height="260" viewBox="0 0 560 260"><rect x="0"></rect></svg>';

    const { container } = render(
      <NotebookQueryChart
        svg={raw}
        section={querySection({ chart: { mark: "bar" } })}
        result={result()}
      />
    );

    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("viewBox", "0 0 560 260");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg?.getAttribute("width")).toBeNull();
  });

  // The wrapper stretches its SVG to fill the column ([&_svg]:w-full), which
  // is correct on a narrow screen and the whole of the bug on a wide one: a
  // `viewBox` scales everything inside it uniformly, so an uncapped width
  // magnifies every stroke and font size the server compiled by however far
  // past the intrinsic width the column happens to be.
  it("should_cap_the_wrapper_at_the_chart_size_it_was_compiled_at", () => {
    const { container } = render(
      <NotebookQueryChart
        svg={SVG}
        section={querySection({ chart: { mark: "bar", size: "lg" } })}
        result={result()}
      />
    );

    const wrapper = container.querySelector('[role="img"]');
    expect(wrapper).toHaveStyle({ maxWidth: `${NOTEBOOK_CHART_SIZE_WIDTH.lg}px` });
  });

  // No stored `size` resolves to the same default the server compiled
  // against, not to an uncapped wrapper.
  it("should_cap_at_the_default_size_when_the_chart_names_none", () => {
    const { container } = render(
      <NotebookQueryChart
        svg={SVG}
        section={querySection({ chart: { mark: "bar" } })}
        result={result()}
      />
    );

    const wrapper = container.querySelector('[role="img"]');
    expect(wrapper).toHaveStyle({ maxWidth: `${NOTEBOOK_CHART_SIZE_WIDTH.md}px` });
  });

  it("should_put_the_figures_in_a_real_table_beneath_the_picture", () => {
    const { container } = render(
      <NotebookQueryChart
        svg={SVG}
        section={querySection({ chart: { mark: "bar" } })}
        result={result()}
      />
    );

    expect(container.querySelector("details table")).not.toBeNull();
    expect(screen.getByText("$1,250")).toBeInTheDocument();
  });

  // DEFENCE IN DEPTH. The server already applied this predicate before caching
  // the string; applying it again at the injection point means a cache entry
  // written by an older build, or by a build whose guard was weaker, still
  // cannot put unexpected markup into the document.
  it("should_render_the_table_alone_when_the_svg_fails_the_structural_guard", () => {
    const unsafe = '<svg viewBox="0 0 4 4"><foreignObject></foreignObject></svg>';

    const { container } = render(
      <NotebookQueryChart
        svg={unsafe}
        section={querySection({ chart: { mark: "bar" } })}
        result={result()}
      />
    );

    expect(container.querySelector("svg")).toBeNull();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("$1,250")).toBeInTheDocument();
  });
});

describe("the query section's chart branch", () => {
  it("should_render_the_table_for_a_section_that_asked_for_no_chart", () => {
    const { container } = renderPage(querySection());

    expect(container.querySelector("svg")).toBeNull();
    expect(container.querySelector("table")).not.toBeNull();
  });

  it("should_render_the_compiled_chart_when_the_loader_produced_one", () => {
    const section = querySection({ chart: { mark: "bar" } });

    const { container } = renderPage(section, { [queryChartKey(section)]: SVG });

    expect(container.querySelector("svg")).not.toBeNull();
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  // Present-with-null is the renderer saying "these figures do not make an
  // honest picture". The section is not unavailable — it has its answer.
  it("should_render_the_table_when_the_compile_declined", () => {
    const section = querySection({ chart: { mark: "bar" } });

    const { container } = renderPage(section, { [queryChartKey(section)]: null });

    expect(container.querySelector("svg")).toBeNull();
    expect(screen.getByText("$1,250")).toBeInTheDocument();
  });

  it("should_render_the_table_when_no_chart_was_compiled_for_this_page_at_all", () => {
    const section = querySection({ chart: { mark: "bar" } });

    const { container } = renderPage(section);

    expect(container.querySelector("svg")).toBeNull();
    expect(screen.getByText("$1,250")).toBeInTheDocument();
  });

  // The two keys are built by different callers — the loader writes them, the
  // renderer reads them — so a page drawing the right picture is evidence the
  // presentation actually took part in the key.
  it("should_read_the_chart_under_the_key_that_includes_the_presentation", () => {
    const section = querySection({ chart: { mark: "bar", size: "lg" } });

    const { container } = renderPage(section, {
      [queryChartKey(querySection({ chart: { mark: "bar" } }))]: SVG,
    });

    expect(container.querySelector("svg")).toBeNull();
  });
});
