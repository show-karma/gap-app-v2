import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SectionComposer } from "@/components/Pages/Admin/Notebooks/SectionComposer";
import type { NotebookMetricCatalog } from "@/services/notebooks/notebook-metric-registry.types";
import { NOTEBOOK_KPI_METRICS, type NotebookSpec } from "@/services/notebooks/notebook-spec";

// The repo's convention for Radix Select under jsdom: render the items as a
// native select so the option set — which is the closed vocabulary, and the
// thing worth asserting — is observable without driving a portal.
vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
  }) => (
    <select aria-label="Data" onChange={(e) => onValueChange(e.target.value)} value={value}>
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

function spec(sections: NotebookSpec["sections"]): NotebookSpec {
  return { version: 1, sections };
}

function renderComposer(initial: NotebookSpec, metricCatalog?: NotebookMetricCatalog) {
  const onChange = vi.fn();
  render(<SectionComposer spec={initial} onChange={onChange} metricCatalog={metricCatalog} />);
  return onChange;
}

function metricCatalog(): NotebookMetricCatalog {
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
        ],
        windows: { allowed: ["90d", "all"], default: "90d" },
        source: { tool: "gap", endpoints: ["/v2/x"], methodology: "Sum of payouts." },
      },
    ],
    options: {
      programs: [{ id: "prog-1", label: "Program One", type: null, chainID: null }],
      aggregations: ["sum"],
      kernelTiers: [],
    },
    freshness: { stale: false },
  };
}

const QUERY_SECTION = {
  type: "query",
  metricId: "funding.disbursed",
  groupBy: "none",
  window: "90d",
  title: "Disbursed",
} as const;

/**
 * A query section is only composable against a catalogue.
 *
 * Every choice it stores — metric, grouping, window, filters — comes from the
 * community's own catalogue, so without one there is nothing to offer and an
 * author could only store a question the server would refuse.
 */
describe("query sections", () => {
  it("should_not_offer_a_query_section_without_a_catalogue", () => {
    renderComposer(spec([{ type: "applications" }]));

    expect(screen.queryByRole("button", { name: /^query$/i })).not.toBeInTheDocument();
  });

  it("should_offer_a_query_section_when_a_catalogue_is_present", () => {
    renderComposer(spec([{ type: "applications" }]), metricCatalog());

    expect(screen.getByRole("button", { name: /^query$/i })).toBeInTheDocument();
  });

  // The mock renders every Select alike, so the assertion is on the OPTION
  // SETS — which is the closed vocabulary, and the thing actually worth
  // asserting. A component offering a dimension the metric never declared
  // would fail here.
  it("should_offer_only_the_groupings_and_windows_the_metric_declares", () => {
    renderComposer(spec([QUERY_SECTION]), metricCatalog());

    const selects = screen.getAllByRole("combobox");
    const optionSets = selects.map((select) =>
      Array.from(select.querySelectorAll("option")).map((option) => option.getAttribute("value"))
    );

    expect(optionSets).toContainEqual(["none", "program"]);
    expect(optionSets).toContainEqual(["90d", "all"]);
    // 12m and 30d exist in the vocabulary and are NOT offered, because this
    // metric does not allow them.
    expect(optionSets.flat()).not.toContain("12m");
  });

  it("should_offer_the_filters_options_the_catalogue_publishes", () => {
    renderComposer(spec([QUERY_SECTION]), metricCatalog());

    expect(screen.getByRole("checkbox", { name: "Program One" })).toBeInTheDocument();
  });

  // Silently resetting a stored choice changes what a page says without
  // anybody deciding to change it.
  it("should_keep_a_retired_metric_visible_rather_than_resetting_it", () => {
    renderComposer(spec([{ ...QUERY_SECTION, metricId: "funding.retired" }]), metricCatalog());

    expect(screen.getByRole("option", { name: /not in this community/i })).toBeInTheDocument();
  });

  it("should_say_so_rather_than_offering_an_empty_picker_when_the_catalogue_is_missing", () => {
    renderComposer(spec([QUERY_SECTION]));

    expect(screen.getByText(/catalogue could not be loaded/i)).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});

describe("SectionComposer", () => {
  // The form offers the vocabulary and nothing else. An author cannot reach a
  // metric that is not in the enum, which is why the server's rejection of one
  // is a defence against a crafted request rather than against normal use.
  it("offers exactly the KPI metrics in the closed vocabulary", () => {
    renderComposer(spec([{ type: "kpis", metrics: ["committed"] }]));

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(NOTEBOOK_KPI_METRICS.length);
  });

  it("offers exactly the bar sources in the closed vocabulary", () => {
    renderComposer(
      spec([{ type: "bars", source: "programs", metric: "disbursedVsCommitted", title: "T" }])
    );

    const options = screen.getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["Funding programs", "Tracks"]);
  });

  // Each source expresses one series, so the metric is shown, not chosen.
  // Offering it as a dropdown would imply a decision that does not exist.
  it("states the metric a bar section will show rather than asking", () => {
    renderComposer(
      spec([{ type: "bars", source: "tracks", metric: "milestoneCompletion", title: "T" }])
    );

    expect(screen.getByText(/Shows: Average milestone completion/i)).toBeInTheDocument();
    // One select only: the source. No second one for the metric.
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
  });

  it("ticks a metric on and reports the new spec", async () => {
    const onChange = renderComposer(spec([{ type: "kpis", metrics: ["committed"] }]));

    await userEvent.click(screen.getByRole("checkbox", { name: /Disbursed/i }));

    expect(onChange).toHaveBeenCalledWith(
      spec([{ type: "kpis", metrics: ["committed", "disbursed"] }])
    );
  });

  // An empty KPI row renders nothing and the server rejects it, so the last
  // remaining metric is not untickable — the author stays in a saveable state.
  it("disables the last remaining KPI metric so it cannot be unticked", () => {
    renderComposer(spec([{ type: "kpis", metrics: ["committed"] }]));

    expect(screen.getByRole("checkbox", { name: /Committed/i })).toBeDisabled();
  });

  it("re-enables unticking once a second metric is selected", () => {
    renderComposer(spec([{ type: "kpis", metrics: ["committed", "disbursed"] }]));

    expect(screen.getByRole("checkbox", { name: /Committed/i })).toBeEnabled();
  });

  describe("ordering", () => {
    const two = spec([{ type: "kpis", metrics: ["committed"] }, { type: "applications" }]);

    it("cannot move the first section up", () => {
      renderComposer(two);

      expect(screen.getByRole("button", { name: /Move section 1 up/i })).toBeDisabled();
    });

    it("cannot move the last section down", () => {
      renderComposer(two);

      expect(screen.getByRole("button", { name: /Move section 2 down/i })).toBeDisabled();
    });

    it("reorders through the move controls", async () => {
      const onChange = renderComposer(two);

      await userEvent.click(screen.getByRole("button", { name: /Move section 1 down/i }));

      expect(onChange).toHaveBeenCalledWith(
        spec([{ type: "applications" }, { type: "kpis", metrics: ["committed"] }])
      );
    });
  });

  it("removes a section", async () => {
    const onChange = renderComposer(
      spec([{ type: "kpis", metrics: ["committed"] }, { type: "applications" }])
    );

    await userEvent.click(screen.getByRole("button", { name: /Remove section 2/i }));

    expect(onChange).toHaveBeenCalledWith(spec([{ type: "kpis", metrics: ["committed"] }]));
  });

  it("adds each section type from the closed vocabulary", async () => {
    const onChange = renderComposer(spec([{ type: "applications" }]));

    await userEvent.click(screen.getByRole("button", { name: /KPI tiles/i }));

    expect(onChange).toHaveBeenCalledWith(
      spec([{ type: "applications" }, { type: "kpis", metrics: ["committed"] }])
    );
  });

  it("edits a bar section's heading", async () => {
    const onChange = renderComposer(
      spec([{ type: "bars", source: "programs", metric: "disbursedVsCommitted", title: "T" }])
    );

    await userEvent.type(screen.getByDisplayValue("T"), "X");

    expect(onChange).toHaveBeenCalledWith(
      spec([{ type: "bars", source: "programs", metric: "disbursedVsCommitted", title: "TX" }])
    );
  });

  // The schema rejects a blank description but accepts its absence, so an
  // emptied field must mean "no description" rather than an empty one.
  it("treats an emptied description as absent, not as an empty string", async () => {
    const onChange = renderComposer(
      spec([
        {
          type: "bars",
          source: "programs",
          metric: "disbursedVsCommitted",
          title: "T",
          description: "d",
        },
      ])
    );

    await userEvent.clear(screen.getByDisplayValue("d"));

    expect(onChange).toHaveBeenCalledWith(
      spec([
        {
          type: "bars",
          source: "programs",
          metric: "disbursedVsCommitted",
          title: "T",
          description: undefined,
        },
      ])
    );
  });

  // F2. A community must not be offered another programme's indicator to
  // publish under its own name. The picker uses a rule NARROWER than the
  // server's — kernel and unowned only — because the browser cannot resolve
  // the community's chain variants and a single-uid compare would wrongly
  // reject an admin's own indicator from a sibling chain.
  describe("indicator picker scoping", () => {
    const timeseriesSpec = (indicatorId = "") =>
      spec([
        {
          type: "timeseries",
          source: "indicators",
          indicatorId,
          chartStyle: "line",
          title: "T",
        },
      ]);

    const catalog = [
      {
        id: "a",
        label: "Kernel metric",
        description: "",
        unit: "",
        kernelId: "k1",
        communityUID: "0xother",
        syncType: "auto" as const,
      },
      {
        id: "b",
        label: "Global metric",
        description: "",
        unit: "",
        kernelId: null,
        communityUID: null,
        syncType: "auto" as const,
      },
      {
        id: "c",
        label: "Someone elses metric",
        description: "",
        unit: "",
        kernelId: null,
        communityUID: "0xother",
        syncType: "auto" as const,
      },
    ];

    function renderPicker(initial = timeseriesSpec()) {
      const onChange = vi.fn();
      render(<SectionComposer spec={initial} onChange={onChange} indicators={catalog} />);
      return onChange;
    }

    it("offers kernel and unowned indicators", () => {
      renderPicker();

      expect(screen.getByRole("option", { name: /Kernel metric/i })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /Global metric/i })).toBeInTheDocument();
    });

    it("does not offer an indicator owned by another community", () => {
      renderPicker();

      expect(
        screen.queryByRole("option", { name: /Someone elses metric/i })
      ).not.toBeInTheDocument();
    });

    // Editing an existing page must not silently drop the chart it already
    // has, so the current value stays visible even when it is not offerable.
    it("keeps the currently selected indicator visible even if not offerable", () => {
      renderPicker(timeseriesSpec("c"));

      expect(screen.getByRole("option", { name: /not in this community/i })).toBeInTheDocument();
    });
  });

  describe("tier rollup section", () => {
    it("offers a Tier rollup section to add", () => {
      renderComposer(spec([{ type: "applications" }]));

      expect(screen.getByRole("button", { name: /tier rollup/i })).toBeInTheDocument();
    });

    // The rollup's columns are declared by the query layer and travel with the
    // data. Offering a picker here would be a second copy of that decision,
    // and the section schema has nowhere to put the answer.
    it("offers no column picker, because the query layer declares the columns", () => {
      renderComposer(spec([{ type: "tiers", source: "kernel", title: "Kernel tiers" }]));

      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: /heading/i })).toHaveValue("Kernel tiers");
    });

    it("edits the heading", () => {
      const onChange = renderComposer(
        spec([{ type: "tiers", source: "kernel", title: "Kernel tiers" }])
      );

      fireEvent.change(screen.getByRole("textbox", { name: /heading/i }), {
        target: { value: "Tiers of the kernel" },
      });

      expect(onChange).toHaveBeenCalledWith({
        version: 1,
        sections: [{ type: "tiers", source: "kernel", title: "Tiers of the kernel" }],
      });
    });
  });

  describe("editorial sections", () => {
    it.each(["Page header", "Headline", "Section nav", "Narrative"])("offers %s", (label) => {
      renderComposer(spec([{ type: "applications" }]));

      expect(screen.getByRole("button", { name: new RegExp(label, "i") })).toBeInTheDocument();
    });

    // One change event with the whole string — what a paste produces. Typing
    // character by character cannot work here: the field is controlled by the
    // spec, and the spec does not advance behind a mocked onChange.
    it("parses a slash-separated breadcrumb trail into crumbs", () => {
      const onChange = renderComposer(spec([{ type: "header" }]));

      fireEvent.change(screen.getByRole("textbox", { name: /breadcrumbs/i }), {
        target: { value: "filpgf.io / Kernel / Monitoring" },
      });

      expect(onChange).toHaveBeenCalledWith(
        spec([{ type: "header", breadcrumbs: ["filpgf.io", "Kernel", "Monitoring"] }])
      );
    });

    it("drops empty crumbs rather than saving a blank one", () => {
      const onChange = renderComposer(spec([{ type: "header" }]));

      fireEvent.change(screen.getByRole("textbox", { name: /breadcrumbs/i }), {
        target: { value: "filpgf.io //  / Kernel" },
      });

      expect(onChange).toHaveBeenCalledWith(
        spec([{ type: "header", breadcrumbs: ["filpgf.io", "Kernel"] }])
      );
    });

    // A breadcrumb usually IS a link, so the exception has to be stated.
    it("tells the author that breadcrumbs are not links", () => {
      renderComposer(spec([{ type: "header" }]));

      expect(screen.getByText(/labels, not links/i)).toBeInTheDocument();
    });

    it("needs no configuration for the nav", () => {
      renderComposer(spec([{ type: "nav" }]));

      expect(screen.getByText(/generated automatically/i)).toBeInTheDocument();
    });

    describe("narrative", () => {
      it("inserts a token when a figure is picked", async () => {
        const onChange = renderComposer(spec([{ type: "narrative", body: "Total " }]));

        await userEvent.click(screen.getByRole("button", { name: /^Committed$/i }));

        expect(onChange).toHaveBeenCalledWith(
          spec([{ type: "narrative", body: "Total {{committed}}" }])
        );
      });

      // The server refuses an unknown token; the author should find out here,
      // not from a failed save.
      it("warns about an unknown token as it is typed", () => {
        renderComposer(spec([{ type: "narrative", body: "Total {{revenue}}." }]));

        expect(screen.getByRole("alert")).toHaveTextContent(/revenue/i);
      });

      it("does not warn when every token is known", () => {
        renderComposer(spec([{ type: "narrative", body: "Total {{committed}}." }]));

        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      });
    });
  });

  describe("text blocks", () => {
    it("offers a text block as an addable section", async () => {
      const onChange = renderComposer(spec([{ type: "applications" }]));

      await userEvent.click(screen.getByRole("button", { name: /Text block/i }));

      expect(onChange).toHaveBeenCalledWith(
        spec([{ type: "applications" }, { type: "text", body: "" }])
      );
    });

    it("edits the body", async () => {
      const onChange = renderComposer(spec([{ type: "text", body: "a" }]));

      await userEvent.type(screen.getByDisplayValue("a"), "b");

      expect(onChange).toHaveBeenCalledWith(spec([{ type: "text", body: "ab" }]));
    });

    // The schema rejects a blank heading but accepts its absence.
    it("treats an emptied heading as absent", async () => {
      const onChange = renderComposer(spec([{ type: "text", title: "H", body: "b" }]));

      await userEvent.clear(screen.getByDisplayValue("H"));

      expect(onChange).toHaveBeenCalledWith(spec([{ type: "text", title: undefined, body: "b" }]));
    });

    // An author will reasonably assume markdown works. Saying so is cheaper
    // than them discovering it on a published page.
    it("tells the author that formatting is not rendered", () => {
      renderComposer(spec([{ type: "text", body: "b" }]));

      expect(screen.getByText(/Plain text only/i)).toBeInTheDocument();
    });
  });

  // An author who is told only that the preview is empty has no idea it is one
  // click away. The copy names the action.
  it("tells the author how to preview a chart they just added", () => {
    renderComposer(
      spec([
        {
          type: "timeseries",
          source: "indicators",
          indicatorId: "5fadb30d-558d-45fc-b873-a8fe678cedd4",
          chartStyle: "line",
          title: "T",
        },
      ])
    );

    expect(screen.getByText(/Save as draft to preview this chart/i)).toBeInTheDocument();
  });

  // Now that the renderers exist, both are offered. The rule that gated them
  // has not changed — a type is offered exactly when it can be drawn.
  it.each(["Time series", "Table"])("offers %s now that it can be drawn", (label) => {
    renderComposer(spec([{ type: "applications" }]));

    expect(screen.getByRole("button", { name: new RegExp(label, "i") })).toBeInTheDocument();
  });

  it("bounds author free text to what the schema accepts", () => {
    renderComposer(
      spec([{ type: "bars", source: "programs", metric: "disbursedVsCommitted", title: "T" }])
    );

    expect(screen.getByDisplayValue("T")).toHaveAttribute("maxlength", "200");
  });
});

/**
 * The composer's one door for untrusted markup.
 *
 * The tests that matter here are not about the textarea. They are about what
 * the surface SAYS: a reviewer looking at a page has to be able to tell the
 * block whose figures came from our query layer from the block whose figures
 * came from whoever typed them, and the moment that distinction is only in a
 * schema, it stops being visible to the person deciding whether to publish.
 */
describe("SectionComposer custom HTML", () => {
  it("offers a custom block as an ordinary section type", async () => {
    const onChange = renderComposer(spec([{ type: "applications" }]));

    await userEvent.click(screen.getByRole("button", { name: /Custom HTML/i }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        sections: [{ type: "applications" }, expect.objectContaining({ type: "custom-html" })],
      })
    );
  });

  // A section that is invalid the instant it is created puts the whole page in
  // an error state before the author has typed anything.
  it("creates it already valid rather than empty", async () => {
    const onChange = renderComposer(spec([{ type: "applications" }]));

    await userEvent.click(screen.getByRole("button", { name: /Custom HTML/i }));

    const added = onChange.mock.calls[0][0].sections[1];
    expect(added.html.length).toBeGreaterThan(0);
  });

  // THE ONE THAT MATTERS. Publishing is how an admin vouches for a page, and
  // this block is the one part of it nothing behind them has checked.
  it("marks the block unverified beside it, not in a summary elsewhere", () => {
    renderComposer(spec([{ type: "custom-html", html: "<p>hand written</p>" }]));

    expect(screen.getByText(/Custom — figures unverified/i)).toBeInTheDocument();
  });

  it("shows that notice on a hand-pasted block, which has no provenance entry", () => {
    // The common case: an author who pasted their own markup. Keying the
    // warning off the generator's evidence would show it on exactly the blocks
    // that did not need it.
    renderComposer(spec([{ type: "custom-html", html: "<p>x</p>" }]));

    expect(screen.getByText(/Custom — figures unverified/i)).toBeInTheDocument();
  });

  it("does not mark a composed section as unverified", () => {
    renderComposer(spec([{ type: "applications" }]));

    expect(screen.queryByText(/Custom — figures unverified/i)).not.toBeInTheDocument();
  });

  it("bounds the document to what the schema accepts", () => {
    renderComposer(spec([{ type: "custom-html", html: "<p>x</p>" }]));

    expect(screen.getByDisplayValue("<p>x</p>")).toHaveAttribute("maxlength", "500000");
  });

  // The field is called "title" and every other title in this form is drawn on
  // the page. This one is not, and the form has to say so or an author will
  // reasonably expect a heading that never appears.
  it("says the frame title is not shown on the page", () => {
    renderComposer(spec([{ type: "custom-html", html: "<p>x</p>", title: "Methodology" }]));

    expect(screen.getByText(/not shown on the page/i)).toBeInTheDocument();
  });
});
