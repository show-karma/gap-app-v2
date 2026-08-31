import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SectionComposer } from "@/components/Pages/Admin/Notebooks/SectionComposer";
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

function renderComposer(initial: NotebookSpec) {
  const onChange = vi.fn();
  render(<SectionComposer spec={initial} onChange={onChange} />);
  return onChange;
}

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

  // Accepted by the schema so the contract and tests can exercise it, but not
  // offered until the renderer can draw one — a section that renders as
  // nothing is worse than one the composer does not yet list.
  it("does not offer a section type the renderer cannot draw", () => {
    renderComposer(spec([{ type: "applications" }]));

    expect(screen.queryByRole("button", { name: /Time series/i })).not.toBeInTheDocument();
  });

  it("bounds author free text to what the schema accepts", () => {
    renderComposer(
      spec([{ type: "bars", source: "programs", metric: "disbursedVsCommitted", title: "T" }])
    );

    expect(screen.getByDisplayValue("T")).toHaveAttribute("maxlength", "200");
  });
});
