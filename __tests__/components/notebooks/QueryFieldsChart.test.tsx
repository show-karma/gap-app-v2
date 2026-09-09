import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import { Children, isValidElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { QueryFields } from "@/components/Pages/Admin/Notebooks/QueryFields";
import type {
  NotebookMetricCatalog,
  NotebookMetricDefinition,
} from "@/services/notebooks/notebook-metric-registry.types";
import type { NotebookQuerySection } from "@/services/notebooks/notebook-spec";

/**
 * Choosing how a query is DRAWN, in the place the choice is persisted.
 *
 * TWO RULES PULL AGAINST EACH OTHER HERE, and both are tested.
 *
 * A mark that cannot honestly draw the current grouping is not OFFERED — a
 * line over programs asserts a trend between neighbours that are in no order,
 * and the indexer's schema refuses to store one anyway, so offering it would
 * only produce a save that fails.
 *
 * But a mark ALREADY STORED stays visible, labelled as not valid, rather than
 * being silently rewritten on render. That is the same doctrine the metric
 * picker follows for a metric the catalogue dropped: quietly changing what an
 * author stored is how a page changes meaning with nobody deciding to change
 * it. Pruning happens when the author acts — picks a different metric, picks a
 * different grouping — because those acts already reset the question.
 */

// The repo's convention for Radix Select under jsdom, extended to carry each
// trigger's accessible name onto the native element — this form has five
// selects and the assertions are about which one.
vi.mock("@/components/ui/select", () => {
  const triggerLabel = (children: React.ReactNode): string | undefined => {
    let label: string | undefined;
    Children.forEach(children, (child) => {
      if (!isValidElement(child)) return;
      const props = child.props as { "aria-label"?: string };
      if (props?.["aria-label"]) label = props["aria-label"];
    });
    return label;
  };

  return {
    Select: ({
      value,
      onValueChange,
      children,
    }: {
      value: string;
      onValueChange: (value: string) => void;
      children: React.ReactNode;
    }) => (
      <select
        aria-label={triggerLabel(children)}
        onChange={(event) => onValueChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
    ),
    SelectTrigger: () => null,
    SelectValue: () => null,
    SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
      <option value={value}>{children}</option>
    ),
  };
});

function metric(overrides: Partial<NotebookMetricDefinition> = {}): NotebookMetricDefinition {
  return {
    id: "funding.disbursed",
    label: "Disbursed",
    description: "Funds paid out.",
    entity: "funding",
    measure: "disbursed",
    valueKind: "currency",
    unit: "USDC",
    dimensions: ["program", "none"],
    filters: [],
    windows: { allowed: ["90d", "all"], default: "90d" },
    source: { tool: "gap", endpoints: ["/v2/x"], methodology: "Sum of payouts." },
    ...overrides,
  };
}

function catalog(items: NotebookMetricDefinition[] = [metric()]): NotebookMetricCatalog {
  return {
    community: { requested: "filecoin", slug: "filecoin", variantUIDs: ["0xf11ec01a"] },
    items,
    options: { programs: [], aggregations: ["sum"], kernelTiers: [] },
    freshness: { stale: false },
  };
}

function section(overrides: Partial<NotebookQuerySection> = {}): NotebookQuerySection {
  return {
    type: "query",
    metricId: "funding.disbursed",
    groupBy: "program",
    window: "90d",
    title: "Disbursed by program",
    ...overrides,
  } as NotebookQuerySection;
}

function renderFields(current: NotebookQuerySection, items?: NotebookMetricDefinition[]) {
  const onFieldChange = vi.fn();
  render(
    <QueryFields
      fieldId="s0"
      section={current}
      catalog={catalog(items)}
      onFieldChange={onFieldChange}
    />
  );
  return onFieldChange;
}

function presentationOptions(): string[] {
  const select = screen.getByRole("combobox", { name: "Presentation" });
  return Array.from(select.querySelectorAll("option")).map(
    (option) => option.getAttribute("value") ?? ""
  );
}

async function choosePresentation(value: string) {
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Presentation" }), value);
}

describe("the presentation options", () => {
  it("should_default_to_the_table_for_a_section_with_no_chart", () => {
    renderFields(section());

    expect(screen.getByRole("combobox", { name: "Presentation" })).toHaveValue("table");
  });

  // A categorical grouping can carry every categorical mark and no temporal
  // one: a line drawn over programs would assert a slope between names.
  it("should_offer_the_categorical_marks_and_never_the_line_for_a_grouped_query", () => {
    renderFields(section({ groupBy: "program" }));

    expect(presentationOptions()).toEqual(["table", "bar", "hbar", "donut"]);
  });

  // One number is not a set of parts, so a donut over an ungrouped total has
  // no whole to be parts of.
  it("should_not_offer_a_donut_for_an_ungrouped_total", () => {
    renderFields(section({ groupBy: "none" }));

    expect(presentationOptions()).toEqual(["table", "bar", "hbar"]);
  });

  it("should_offer_only_the_line_for_a_date_grouping", () => {
    renderFields(section({ groupBy: "date" }), [metric({ dimensions: ["date", "program"] })]);

    expect(presentationOptions()).toEqual(["table", "line"]);
  });

  // Percentages are already shares of something else; summing them into arcs
  // produces a denominator that exists nowhere. The catalogue knows the kind,
  // so the picker can refuse before anything is stored.
  it("should_not_offer_a_donut_for_a_percentage_metric", () => {
    renderFields(section({ metricId: "funding.share" }), [
      metric({ id: "funding.share", valueKind: "percent" }),
    ]);

    expect(presentationOptions()).toEqual(["table", "bar", "hbar"]);
  });
});

describe("choosing a presentation", () => {
  it("should_store_the_chosen_mark", async () => {
    const onFieldChange = renderFields(section());

    await choosePresentation("hbar");

    expect(onFieldChange).toHaveBeenCalledWith(
      expect.objectContaining({ chart: { mark: "hbar" } })
    );
  });

  // Sort and size are the author's, not the mark's. Re-picking the shape of a
  // chart must not quietly discard how they asked it to be ordered.
  it("should_keep_the_stored_sort_and_size_when_the_mark_changes", async () => {
    const onFieldChange = renderFields(
      section({ chart: { mark: "bar", sort: "label-asc", size: "lg" } })
    );

    await choosePresentation("hbar");

    expect(onFieldChange).toHaveBeenCalledWith(
      expect.objectContaining({ chart: { mark: "hbar", sort: "label-asc", size: "lg" } })
    );
  });

  it("should_drop_the_chart_entirely_when_the_table_is_chosen", async () => {
    const onFieldChange = renderFields(section({ chart: { mark: "donut" } }));

    await choosePresentation("table");

    expect(onFieldChange).toHaveBeenCalledWith(expect.objectContaining({ chart: undefined }));
  });
});

describe("a stored chart the current grouping cannot draw", () => {
  // The doctrine at QueryFields.tsx:34-38, applied to presentation: what an
  // author stored stays visible and stays theirs until they change it.
  it("should_stay_visible_marked_as_not_valid_rather_than_disappearing", () => {
    renderFields(section({ groupBy: "none", chart: { mark: "donut" } }));

    expect(presentationOptions()).toContain("donut");
    expect(screen.getByText(/donut.*not valid for this grouping/i)).toBeInTheDocument();
  });

  it("should_not_be_rewritten_just_because_the_form_rendered", () => {
    const onFieldChange = renderFields(section({ groupBy: "none", chart: { mark: "donut" } }));

    expect(onFieldChange).not.toHaveBeenCalled();
  });
});

describe("pruning a stranded chart", () => {
  // chooseGrouping is the obvious half.
  it("should_drop_a_donut_when_the_author_regroups_to_a_single_total", async () => {
    const onFieldChange = renderFields(section({ chart: { mark: "donut" } }));

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Group by" }), "none");

    expect(onFieldChange).toHaveBeenCalledWith(expect.objectContaining({ chart: undefined }));
  });

  it("should_keep_a_chart_the_new_grouping_can_still_draw", async () => {
    const onFieldChange = renderFields(section({ groupBy: "none", chart: { mark: "bar" } }));

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Group by" }), "program");

    expect(onFieldChange).toHaveBeenCalledWith(
      expect.objectContaining({ groupBy: "program", chart: { mark: "bar" } })
    );
  });

  // chooseMetric is the half that gets missed. It RESETS groupBy to the new
  // metric's first dimension, so a chart that was valid a moment ago can be
  // stranded by a control that never mentions charts.
  it("should_drop_a_donut_when_a_new_metric_resets_the_grouping_to_none", async () => {
    const onFieldChange = renderFields(section({ chart: { mark: "donut" } }), [
      metric(),
      metric({ id: "funding.total", label: "Total", dimensions: ["none"] }),
    ]);

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Metric" }),
      "funding.total"
    );

    expect(onFieldChange).toHaveBeenCalledWith(
      expect.objectContaining({ metricId: "funding.total", groupBy: "none", chart: undefined })
    );
  });

  // The other stranding a metric change can cause: the new metric's own kind
  // forbids the mark even though the grouping still allows it.
  it("should_drop_a_donut_when_the_new_metric_measures_a_percentage", async () => {
    const onFieldChange = renderFields(section({ chart: { mark: "donut" } }), [
      metric(),
      metric({ id: "funding.share", label: "Share", valueKind: "percent" }),
    ]);

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Metric" }),
      "funding.share"
    );

    expect(onFieldChange).toHaveBeenCalledWith(
      expect.objectContaining({ metricId: "funding.share", chart: undefined })
    );
  });

  it("should_keep_a_chart_the_new_metric_can_still_draw", async () => {
    const onFieldChange = renderFields(section({ chart: { mark: "bar" } }), [
      metric(),
      metric({ id: "funding.committed", label: "Committed" }),
    ]);

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Metric" }),
      "funding.committed"
    );

    expect(onFieldChange).toHaveBeenCalledWith(
      expect.objectContaining({ metricId: "funding.committed", chart: { mark: "bar" } })
    );
  });
});
