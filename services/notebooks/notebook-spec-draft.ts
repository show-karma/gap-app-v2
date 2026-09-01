import {
  NOTEBOOK_BAR_METRICS_BY_SOURCE,
  NOTEBOOK_SPEC_MAX_SECTIONS,
  NOTEBOOK_SPEC_VERSION,
  type NotebookBarSource,
  type NotebookKpiMetric,
  type NotebookSection,
  type NotebookSpec,
  NotebookSpecSchema,
} from "./notebook-spec";

/**
 * Pure spec-composition logic for the builder.
 *
 * Kept out of the components on purpose: "what does adding a section do" is
 * the part of the builder worth testing, and it should not require rendering a
 * form to find out. Every function here takes a spec and returns a NEW spec —
 * no mutation, so React state updates stay predictable and undo would be
 * trivial to add later.
 *
 * None of this is a security boundary. The indexer validates every write
 * against the same closed vocabulary; this exists so an honest author is never
 * offered a choice the server would reject.
 */

/** A blank page: one KPI row, which is the section every dashboard starts with. */
export function emptyNotebookSpec(): NotebookSpec {
  return {
    version: NOTEBOOK_SPEC_VERSION,
    sections: [{ type: "kpis", metrics: ["committed"] }],
  };
}

/**
 * The metric a source can express.
 *
 * Each source has exactly one, so the builder does not ask — it derives. An
 * author choosing "Tracks" has already chosen the only metric tracks can show,
 * and presenting that as a second decision would imply choices that do not
 * exist. The table is the shared one, so this cannot drift from what the
 * server accepts.
 */
export function defaultMetricForSource(source: NotebookBarSource) {
  return NOTEBOOK_BAR_METRICS_BY_SOURCE[source][0];
}

/**
 * A new section of the requested type, pre-filled so it is valid on creation.
 *
 * An exhaustive switch, deliberately: this used to end in a bare `return` of a
 * bars section, so widening the vocabulary silently turned "add a text block"
 * into "add a bar chart". The `never` check below makes the compiler refuse
 * the next widening until this function has an answer for it.
 */
export function newSection(type: NotebookSection["type"]): NotebookSection {
  switch (type) {
    case "kpis":
      return { type: "kpis", metrics: ["committed"] };
    case "applications":
      return { type: "applications" };
    case "text":
      return { type: "text", body: "" };
    case "bars":
      return {
        type: "bars",
        source: "programs",
        metric: defaultMetricForSource("programs"),
        title: "Disbursed against commitment",
      };
    case "table":
      return {
        type: "table",
        source: "kernel",
        columns: ["function", "tier", "measured", "slaMetPct"],
        title: "Kernel function inventory",
      };
    case "header":
      return { type: "header", eyebrow: "" };
    case "hero":
      return { type: "hero", headline: "" };
    case "nav":
      return { type: "nav" };
    case "narrative":
      return { type: "narrative", body: "" };
    case "timeseries":
      // Not offered by the composer yet — the renderer cannot draw one. Still
      // constructed correctly so this stays exhaustive and the day the chart
      // lands, only the composer's offer list changes.
      return {
        type: "timeseries",
        source: "indicators",
        indicatorId: "",
        chartStyle: "line",
        title: "",
      };
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

export function canAddSection(spec: NotebookSpec): boolean {
  return spec.sections.length < NOTEBOOK_SPEC_MAX_SECTIONS;
}

export function addSection(spec: NotebookSpec, type: NotebookSection["type"]): NotebookSpec {
  if (!canAddSection(spec)) return spec;
  return { ...spec, sections: [...spec.sections, newSection(type)] };
}

export function removeSection(spec: NotebookSpec, index: number): NotebookSpec {
  return { ...spec, sections: spec.sections.filter((_, i) => i !== index) };
}

/**
 * Move a section one place up or down.
 *
 * Order is the render order, so this is the only layout control the builder
 * needs. A move that would fall off either end returns the spec unchanged
 * rather than wrapping around — wrapping would silently relocate a section to
 * the opposite end of the page.
 */
export function moveSection(spec: NotebookSpec, index: number, direction: -1 | 1): NotebookSpec {
  const target = index + direction;
  if (index < 0 || index >= spec.sections.length) return spec;
  if (target < 0 || target >= spec.sections.length) return spec;

  const sections = [...spec.sections];
  [sections[index], sections[target]] = [sections[target], sections[index]];
  return { ...spec, sections };
}

export function updateSection(
  spec: NotebookSpec,
  index: number,
  section: NotebookSection
): NotebookSpec {
  return { ...spec, sections: spec.sections.map((s, i) => (i === index ? section : s)) };
}

/**
 * Toggle one KPI within a KPI section, preserving the order metrics were added.
 *
 * Unticking the last remaining metric is refused: an empty KPI row is a
 * section that renders nothing, which the server rejects anyway. Refusing the
 * toggle keeps the author in a valid state instead of letting them build a
 * spec that fails on save with an error about a section they cannot see.
 */
export function toggleKpiMetric(
  spec: NotebookSpec,
  index: number,
  metric: NotebookKpiMetric
): NotebookSpec {
  const section = spec.sections[index];
  if (!section || section.type !== "kpis") return spec;

  const selected = section.metrics.includes(metric);
  if (selected && section.metrics.length === 1) return spec;

  const metrics = selected
    ? section.metrics.filter((m) => m !== metric)
    : [...section.metrics, metric];

  return updateSection(spec, index, { ...section, metrics });
}

/**
 * Point a bar section at a different series, moving its metric with it.
 *
 * The metric is derived rather than preserved: keeping the old one would
 * produce a source/metric pairing the server rejects, and the author would
 * have no way to see why from the form.
 */
export function setBarSource(
  spec: NotebookSpec,
  index: number,
  source: NotebookBarSource
): NotebookSpec {
  const section = spec.sections[index];
  if (!section || section.type !== "bars") return spec;

  return updateSection(spec, index, {
    ...section,
    source,
    metric: defaultMetricForSource(source),
  });
}

/**
 * Whether the spec would be accepted by the server, and why not if it would not.
 *
 * Runs the real schema rather than a hand-written approximation of it, so the
 * builder's idea of "valid" cannot drift from the boundary's. The message is
 * for the author, so it names the section by position — a Zod path like
 * `sections.2.metric` means nothing to someone looking at a form.
 */
export function validateSpec(spec: NotebookSpec): { valid: boolean; error?: string } {
  const result = NotebookSpecSchema.safeParse(spec);
  if (result.success) return { valid: true };

  const issue = result.error.issues[0];
  const sectionIndex = typeof issue?.path[1] === "number" ? issue.path[1] : undefined;
  const where = sectionIndex === undefined ? "" : `Section ${sectionIndex + 1}: `;

  return { valid: false, error: `${where}${issue?.message ?? "This page is not valid yet."}` };
}
