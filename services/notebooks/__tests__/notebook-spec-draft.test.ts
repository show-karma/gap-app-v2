import { describe, expect, it } from "vitest";
import {
  NOTEBOOK_SPEC_MAX_SECTIONS,
  type NotebookSpec,
  NotebookSpecSchema,
} from "@/services/notebooks/notebook-spec";
import {
  addSection,
  canAddSection,
  defaultMetricForSource,
  emptyNotebookSpec,
  moveSection,
  newSection,
  removeSection,
  setBarSource,
  toggleKpiMetric,
  updateSection,
  validateSpec,
} from "@/services/notebooks/notebook-spec-draft";

/**
 * The composer's logic, tested without rendering a form.
 *
 * The invariant that matters most is at the bottom: every operation an author
 * can perform must leave a spec the SERVER would accept. The builder is a
 * convenience, not the boundary — but a builder that can walk itself into a
 * state that fails on save is a builder that blames the author for its own bug.
 */

function spec(sections: NotebookSpec["sections"]): NotebookSpec {
  return { version: 1, sections };
}

describe("emptyNotebookSpec", () => {
  it("starts from a spec the server would accept", () => {
    expect(NotebookSpecSchema.safeParse(emptyNotebookSpec()).success).toBe(true);
  });
});

describe("newSection", () => {
  it.each(["kpis", "bars", "applications", "text"] as const)(
    "builds a valid %s section",
    (type) => {
      // `text` is born with an empty body, which the schema rejects until the
      // author types something — that is the intended "fill this in" state and
      // validateSpec surfaces it, so it is excluded from the validity check.
      const section = newSection(type);
      if (type === "text") {
        expect(section).toEqual({ type: "text", body: "" });
        return;
      }
      expect(NotebookSpecSchema.safeParse(spec([section])).success).toBe(true);
    }
  );

  // This regressed once already: the function ended in a bare `return` of a
  // bars section, so a widened vocabulary silently turned "add a text block"
  // into "add a bar chart".
  it.each(["kpis", "bars", "applications", "text", "timeseries"] as const)(
    "returns the type it was asked for: %s",
    (type) => {
      expect(newSection(type).type).toBe(type);
    }
  );

  // Each source expresses exactly one series, so a new bar section must not be
  // born with a pairing the server rejects.
  it("pairs a new bar section with the metric its source can express", () => {
    const section = newSection("bars");

    expect(section).toMatchObject({ source: "programs", metric: "disbursedVsCommitted" });
  });
});

describe("addSection", () => {
  it("appends without mutating the original spec", () => {
    const original = spec([{ type: "applications" }]);

    const next = addSection(original, "kpis");

    expect(original.sections).toHaveLength(1);
    expect(next.sections).toHaveLength(2);
    expect(next.sections[1].type).toBe("kpis");
  });

  it("refuses to exceed the section limit", () => {
    const full = spec(
      Array.from({ length: NOTEBOOK_SPEC_MAX_SECTIONS }, () => ({ type: "applications" as const }))
    );

    expect(canAddSection(full)).toBe(false);
    expect(addSection(full, "kpis")).toBe(full);
  });
});

describe("removeSection", () => {
  it("removes only the section at that index", () => {
    const original = spec([{ type: "kpis", metrics: ["committed"] }, { type: "applications" }]);

    expect(removeSection(original, 0).sections).toEqual([{ type: "applications" }]);
  });
});

describe("moveSection", () => {
  const original = spec([{ type: "kpis", metrics: ["committed"] }, { type: "applications" }]);

  it("swaps a section with its neighbour", () => {
    expect(moveSection(original, 0, 1).sections.map((s) => s.type)).toEqual([
      "applications",
      "kpis",
    ]);
  });

  // Wrapping would silently relocate a section to the opposite end of the
  // page — an author pressing "up" on the first row expects nothing to happen.
  it.each([
    ["up from the first section", 0, -1 as const],
    ["down from the last section", 1, 1 as const],
  ])("does nothing when moving %s", (_label, index, direction) => {
    expect(moveSection(original, index, direction)).toBe(original);
  });

  it("ignores an index that is not in the list", () => {
    expect(moveSection(original, 9, -1)).toBe(original);
  });
});

describe("toggleKpiMetric", () => {
  it("adds a metric at the end, preserving tick order", () => {
    const next = toggleKpiMetric(spec([{ type: "kpis", metrics: ["committed"] }]), 0, "disbursed");

    expect(next.sections[0]).toMatchObject({ metrics: ["committed", "disbursed"] });
  });

  it("removes a metric that is already selected", () => {
    const next = toggleKpiMetric(
      spec([{ type: "kpis", metrics: ["committed", "disbursed"] }]),
      0,
      "committed"
    );

    expect(next.sections[0]).toMatchObject({ metrics: ["disbursed"] });
  });

  // An empty KPI row renders nothing and the server rejects it. Refusing the
  // toggle keeps the author in a state that can be saved, rather than letting
  // them build one that fails with an error about an invisible section.
  it("refuses to untick the last remaining metric", () => {
    const original = spec([{ type: "kpis", metrics: ["committed"] }]);

    expect(toggleKpiMetric(original, 0, "committed")).toBe(original);
  });

  it("ignores a section that is not a KPI section", () => {
    const original = spec([{ type: "applications" }]);

    expect(toggleKpiMetric(original, 0, "committed")).toBe(original);
  });
});

describe("setBarSource", () => {
  // Preserving the old metric would produce a pairing the server rejects, and
  // the author would have no way to see why from the form.
  it("moves the metric with the source", () => {
    const original = spec([
      {
        type: "bars",
        source: "programs",
        metric: "disbursedVsCommitted",
        title: "Programs",
      },
    ]);

    const next = setBarSource(original, 0, "tracks");

    expect(next.sections[0]).toMatchObject({
      source: "tracks",
      metric: defaultMetricForSource("tracks"),
    });
    expect(NotebookSpecSchema.safeParse(next).success).toBe(true);
  });

  it("keeps the author's heading when the source changes", () => {
    const original = spec([
      { type: "bars", source: "programs", metric: "disbursedVsCommitted", title: "My heading" },
    ]);

    expect(setBarSource(original, 0, "tracks").sections[0]).toMatchObject({
      title: "My heading",
    });
  });
});

describe("updateSection", () => {
  it("replaces only the targeted section", () => {
    const original = spec([{ type: "applications" }, { type: "kpis", metrics: ["committed"] }]);

    const next = updateSection(original, 1, { type: "kpis", metrics: ["disbursed"] });

    expect(next.sections[0]).toEqual({ type: "applications" });
    expect(next.sections[1]).toEqual({ type: "kpis", metrics: ["disbursed"] });
  });
});

describe("validateSpec", () => {
  it("accepts a spec the schema accepts", () => {
    expect(validateSpec(emptyNotebookSpec())).toEqual({ valid: true });
  });

  // Zod's own path ("sections.1.title") means nothing to someone looking at a
  // form, so the message names the section by the position they can see.
  it("names the offending section by its position in the form", () => {
    const invalid = spec([
      { type: "applications" },
      { type: "bars", source: "programs", metric: "disbursedVsCommitted", title: "" },
    ]);

    const result = validateSpec(invalid);

    expect(result.valid).toBe(false);
    expect(result.error).toContain("Section 2");
  });

  it("rejects a page with no sections at all", () => {
    expect(validateSpec(spec([])).valid).toBe(false);
  });
});

// The invariant the whole module exists to hold.
describe("every composer operation leaves a saveable spec", () => {
  it("survives a full compose-and-rearrange session", () => {
    let draft = emptyNotebookSpec();

    draft = addSection(draft, "bars");
    draft = setBarSource(draft, 1, "tracks");
    draft = addSection(draft, "bars");
    draft = addSection(draft, "applications");
    draft = toggleKpiMetric(draft, 0, "milestoneCompletion");
    draft = toggleKpiMetric(draft, 0, "disbursed");
    draft = moveSection(draft, 3, -1);
    draft = removeSection(draft, 0);

    expect(NotebookSpecSchema.safeParse(draft).success).toBe(true);
    expect(validateSpec(draft)).toEqual({ valid: true });
  });
});
