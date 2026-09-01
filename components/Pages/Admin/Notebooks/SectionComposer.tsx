"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  isIndicatorOfferableWithoutVariants,
  type NotebookIndicatorOption,
} from "@/services/notebooks/notebook-indicators.types";
import type { NotebookMetricCatalog } from "@/services/notebooks/notebook-metric-registry.types";
import {
  NOTEBOOK_BAR_METRIC_LABELS,
  NOTEBOOK_BAR_SOURCE_LABELS,
  NOTEBOOK_BAR_SOURCES,
  NOTEBOOK_CHART_STYLE_LABELS,
  NOTEBOOK_CHART_STYLES,
  NOTEBOOK_DATE_RANGE_LABELS,
  NOTEBOOK_DATE_RANGES_BY_SOURCE,
  NOTEBOOK_KERNEL_COLUMN_LABELS,
  NOTEBOOK_KERNEL_RANGE_LABELS,
  NOTEBOOK_KERNEL_RANGES,
  NOTEBOOK_KERNEL_TABLE_COLUMNS,
  NOTEBOOK_KPI_METRIC_LABELS,
  NOTEBOOK_KPI_METRICS,
  NOTEBOOK_SECTION_DESCRIPTION_MAX,
  NOTEBOOK_SECTION_TITLE_MAX,
  NOTEBOOK_SPEC_MAX_SECTIONS,
  NOTEBOOK_TEXT_BODY_MAX,
  type NotebookBarsSection,
  type NotebookChartStyle,
  type NotebookDateRange,
  type NotebookKernelRange,
  type NotebookKernelTableColumn,
  type NotebookKpisSection,
  type NotebookQuerySection,
  type NotebookSection,
  type NotebookSpec,
  type NotebookTableSection,
  type NotebookTextSection,
  type NotebookTiersSection,
  type NotebookTimeseriesSection,
  resolveNotebookDateRange,
  resolveNotebookKernelRange,
} from "@/services/notebooks/notebook-spec";
import {
  addSection,
  canAddSection,
  moveSection,
  removeSection,
  setBarSource,
  toggleKpiMetric,
  updateSection,
} from "@/services/notebooks/notebook-spec-draft";
import { HeaderFields, HeroFields, NarrativeFields } from "./EditorialFields";
import { QueryFields } from "./QueryFields";

interface Props {
  spec: NotebookSpec;
  onChange: (next: NotebookSpec) => void;
  /**
   * The indicator catalog, fetched server-side and passed in.
   *
   * The catalog query is `server-only` — it is the same seam the public page
   * reads through — so the composer receives it rather than fetching it.
   */
  indicators?: readonly NotebookIndicatorOption[];
  /**
   * The community's metric catalogue, for composing a query section.
   *
   * Absent when it could not be loaded. "Query" is then not offered at all,
   * because every choice a query section stores has to come from this — a
   * picker with nothing in it would let an author store a question the server
   * will refuse.
   */
  metricCatalog?: NotebookMetricCatalog;
}

/**
 * Compose a page from the closed vocabulary.
 *
 * Every control here is bounded by what the server accepts: the KPI list is
 * the enum, the source list is the enum, and a bar section's metric is derived
 * from its source rather than chosen, because each source expresses exactly
 * one series. An author is never offered a combination that would come back a
 * 400 — but the server still rejects one if it arrives, because this form is a
 * convenience, not the boundary.
 *
 * Order is the render order, so up/down is the whole layout language.
 */
export function SectionComposer({ spec, onChange, indicators = [], metricCatalog }: Props) {
  const atLimit = !canAddSection(spec);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-foreground">Sections</h2>
        <p className="text-sm text-muted-foreground">
          Sections render top to bottom in this order. Two bar sections in a row sit side by side.
        </p>
      </div>

      {spec.sections.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          This page has no sections yet. Add one below.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {spec.sections.map((section, index) => (
            <li
              // Sections are an ordered list with no stable id of their own;
              // the position IS the identity here, and reordering re-renders
              // both affected rows either way.
              key={`${index}-${section.type}`}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4"
            >
              <div className="flex flex-row items-center justify-between gap-3">
                <span className="text-sm font-semibold text-foreground">
                  {sectionLabel(section)}
                </span>
                <div className="flex flex-row items-center gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label={`Move section ${index + 1} up`}
                    disabled={index === 0}
                    onClick={() => onChange(moveSection(spec, index, -1))}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label={`Move section ${index + 1} down`}
                    disabled={index === spec.sections.length - 1}
                    onClick={() => onChange(moveSection(spec, index, 1))}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label={`Remove section ${index + 1}`}
                    onClick={() => onChange(removeSection(spec, index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <SectionFields
                section={section}
                index={index}
                spec={spec}
                indicators={indicators}
                metricCatalog={metricCatalog}
                onChange={onChange}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-row flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Add a section:</span>
        {ADDABLE_SECTION_TYPES.filter(
          // See the prop's note: no catalogue, no query section.
          (type) => type !== "query" || Boolean(metricCatalog)
        ).map((type) => (
          <Button
            key={type}
            variant="secondary"
            size="sm"
            disabled={atLimit}
            onClick={() => onChange(addSection(spec, type, metricCatalog?.items[0]?.id))}
          >
            <Plus className="h-4 w-4" />
            {SECTION_TYPE_LABELS[type]}
          </Button>
        ))}
      </div>
      {atLimit ? (
        <p className="text-xs text-muted-foreground">
          A page can hold up to {NOTEBOOK_SPEC_MAX_SECTIONS} sections.
        </p>
      ) : null}
    </div>
  );
}

/**
 * The form for whichever section this is.
 *
 * Extracted from the list callback, which had grown a conditional per section
 * type and was doing three jobs at once: ordering controls, identity, and
 * every field group in the vocabulary. A switch in its own component says
 * "pick the form" in one place, and the compiler now checks the mapping is
 * complete rather than leaving a type to silently render nothing.
 */
function SectionFields({
  section,
  index,
  spec,
  indicators,
  metricCatalog,
  onChange,
}: {
  section: NotebookSection;
  index: number;
  spec: NotebookSpec;
  indicators: readonly NotebookIndicatorOption[];
  metricCatalog?: NotebookMetricCatalog;
  onChange: (next: NotebookSpec) => void;
}) {
  const fieldId = `section-${index}`;
  const update = (next: NotebookSection) => onChange(updateSection(spec, index, next));

  switch (section.type) {
    case "kpis":
      return (
        <KpiFields
          fieldId={fieldId}
          section={section}
          onToggle={(metric) => onChange(toggleKpiMetric(spec, index, metric))}
        />
      );
    case "bars":
      return (
        <BarFields
          fieldId={fieldId}
          section={section}
          onSourceChange={(source) => onChange(setBarSource(spec, index, source))}
          onFieldChange={update}
        />
      );
    case "timeseries":
      return (
        <TimeseriesFields
          fieldId={fieldId}
          section={section}
          indicators={indicators}
          onFieldChange={update}
        />
      );
    case "query":
      // Unreachable without a catalogue: the add button is not offered without
      // one, and an existing query section on a page whose catalogue will not
      // load says so rather than showing a picker with nothing in it.
      return metricCatalog ? (
        <QueryFields
          fieldId={fieldId}
          section={section}
          catalog={metricCatalog}
          onFieldChange={update}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          The metric catalogue could not be loaded, so this query cannot be edited right now. It
          still renders on the page.
        </p>
      );
    case "tiers":
      // Title and description only — the rollup's columns are declared by the
      // query layer, so there is nothing else here for an author to decide.
      return <TiersFields fieldId={fieldId} section={section} onFieldChange={update} />;
    case "table":
      return <TableFields fieldId={fieldId} section={section} onFieldChange={update} />;
    case "text":
      return <TextFields fieldId={fieldId} section={section} onFieldChange={update} />;
    case "header":
      return <HeaderFields fieldId={fieldId} section={section} onFieldChange={update} />;
    case "hero":
      return <HeroFields fieldId={fieldId} section={section} onFieldChange={update} />;
    case "narrative":
      return <NarrativeFields fieldId={fieldId} section={section} onFieldChange={update} />;
    case "nav":
      return (
        <p className="text-sm text-muted-foreground">
          Links to every titled section on this page, generated automatically. Nothing to configure.
        </p>
      );
    case "applications":
      return (
        <p className="text-sm text-muted-foreground">
          Approved, under review and not approved counts. Nothing to configure.
        </p>
      );
    default: {
      const exhaustive: never = section;
      return exhaustive;
    }
  }
}

const SECTION_TYPE_LABELS: Record<NotebookSection["type"], string> = {
  kpis: "KPI tiles",
  bars: "Bar chart",
  applications: "Applications",
  text: "Text block",
  timeseries: "Time series",
  table: "Table",
  tiers: "Tier rollup",
  query: "Query",
  header: "Page header",
  hero: "Headline",
  nav: "Section nav",
  narrative: "Narrative",
};

/**
 * The section types an author may ADD.
 *
 * Narrower than the vocabulary on purpose. `timeseries` is accepted by the
 * schema so the wire contract and the tests can exercise it, but it is not
 * offered here until the renderer can actually draw it — a composer that lets
 * someone place a section the page renders as nothing is worse than one that
 * does not offer it yet.
 */
const ADDABLE_SECTION_TYPES = [
  "header",
  "hero",
  "nav",
  "narrative",
  "kpis",
  "bars",
  "timeseries",
  "table",
  "tiers",
  "query",
  "applications",
  "text",
] as const;

function sectionLabel(section: NotebookSection): string {
  if (section.type === "bars") {
    return `Bar chart — ${NOTEBOOK_BAR_SOURCE_LABELS[section.source]}`;
  }
  return SECTION_TYPE_LABELS[section.type];
}

function TimeseriesFields({
  fieldId,
  section,
  indicators,
  onFieldChange,
}: {
  fieldId: string;
  section: NotebookTimeseriesSection;
  indicators: readonly NotebookIndicatorOption[];
  onFieldChange: (next: NotebookTimeseriesSection) => void;
}) {
  // Only indicators this community may actually publish. The server decides
  // ownership against every chain variant; the browser has one uid, so the
  // picker uses the narrower rule it CAN evaluate — kernel and unowned — and
  // never offers something the boundary would reject.
  const offerable = indicators.filter(isIndicatorOfferableWithoutVariants);

  // An indicator the catalog no longer offers is still shown as the current
  // value, so an author editing an old page sees WHICH indicator is set rather
  // than a picker that has silently reset itself to something else.
  const known = offerable.some((indicator) => indicator.id === section.indicatorId);

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm" htmlFor={`${fieldId}-indicator`}>
        <span className="font-medium text-foreground">Indicator</span>
        <Select
          value={section.indicatorId}
          onValueChange={(value) => onFieldChange({ ...section, indicatorId: value })}
        >
          <SelectTrigger id={`${fieldId}-indicator`} aria-label="Indicator">
            <SelectValue placeholder="Choose an indicator…" />
          </SelectTrigger>
          <SelectContent>
            {!known && section.indicatorId ? (
              <SelectItem value={section.indicatorId}>
                {section.indicatorId} (not in this community&apos;s catalog)
              </SelectItem>
            ) : null}
            {offerable.map((indicator) => (
              <SelectItem key={indicator.id} value={indicator.id}>
                {indicator.label}
                {indicator.unit ? ` (${indicator.unit})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      <label className="flex flex-col gap-1 text-sm" htmlFor={`${fieldId}-chart-style`}>
        <span className="font-medium text-foreground">Chart</span>
        <Select
          value={section.chartStyle}
          onValueChange={(value) =>
            onFieldChange({ ...section, chartStyle: value as NotebookChartStyle })
          }
        >
          <SelectTrigger id={`${fieldId}-chart-style`} aria-label="Chart">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NOTEBOOK_CHART_STYLES.map((style) => (
              <SelectItem key={style} value={style}>
                {NOTEBOOK_CHART_STYLE_LABELS[style]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      <label className="flex flex-col gap-1 text-sm" htmlFor={`${fieldId}-range`}>
        <span className="font-medium text-foreground">Window</span>
        <Select
          value={resolveNotebookDateRange(section.range)}
          onValueChange={(value) =>
            onFieldChange({ ...section, range: value as NotebookDateRange })
          }
        >
          <SelectTrigger id={`${fieldId}-range`} aria-label="Window">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NOTEBOOK_DATE_RANGES_BY_SOURCE.indicators.map((range) => (
              <SelectItem key={range} value={range}>
                {NOTEBOOK_DATE_RANGE_LABELS[range]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Readings are sparse, so the default is deliberately All time — a
            shorter window can legitimately contain nothing. */}
        <span className="text-xs text-muted-foreground">
          Readings are irregular; a short window may contain none.
        </span>
        {/* Series are fetched on the server for the SAVED spec, so a chart
            added in this session has nothing to draw yet. Naming the action
            beats reporting the absence — an author who is told only that the
            preview is empty has no idea it is one click away. */}
        <span className="text-xs text-muted-foreground">Save as draft to preview this chart.</span>
      </label>

      <label className="flex flex-col gap-1 text-sm" htmlFor={`${fieldId}-ts-title`}>
        <span className="font-medium text-foreground">Heading</span>
        <Input
          id={`${fieldId}-ts-title`}
          type="text"
          value={section.title}
          maxLength={NOTEBOOK_SECTION_TITLE_MAX}
          onChange={(event) => onFieldChange({ ...section, title: event.target.value })}
        />
      </label>
    </div>
  );
}

function TableFields({
  fieldId,
  section,
  onFieldChange,
}: {
  fieldId: string;
  section: NotebookTableSection;
  onFieldChange: (next: NotebookTableSection) => void;
}) {
  const toggleColumn = (column: NotebookKernelTableColumn) => {
    const selected = section.columns.includes(column);
    // The last remaining column cannot be removed: a table with no columns
    // renders nothing and the server rejects it.
    if (selected && section.columns.length === 1) return;
    onFieldChange({
      ...section,
      columns: selected
        ? section.columns.filter((c) => c !== column)
        : [...section.columns, column],
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm text-muted-foreground">
          Columns, in the order you tick them.
        </legend>
        <div className="flex flex-row flex-wrap gap-x-4 gap-y-2">
          {NOTEBOOK_KERNEL_TABLE_COLUMNS.map((column) => {
            const checked = section.columns.includes(column);
            return (
              <label
                key={column}
                htmlFor={`${fieldId}-col-${column}`}
                className="flex flex-row items-center gap-2 text-sm text-foreground"
              >
                <Checkbox
                  id={`${fieldId}-col-${column}`}
                  checked={checked}
                  disabled={checked && section.columns.length === 1}
                  onCheckedChange={() => toggleColumn(column)}
                />
                {NOTEBOOK_KERNEL_COLUMN_LABELS[column]}
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1 text-sm" htmlFor={`${fieldId}-table-range`}>
        <span className="font-medium text-foreground">Window</span>
        <Select
          value={resolveNotebookKernelRange(section.range)}
          onValueChange={(value) =>
            onFieldChange({ ...section, range: value as NotebookKernelRange })
          }
        >
          <SelectTrigger id={`${fieldId}-table-range`} aria-label="Window">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NOTEBOOK_KERNEL_RANGES.map((range) => (
              <SelectItem key={range} value={range}>
                {NOTEBOOK_KERNEL_RANGE_LABELS[range]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      <label className="flex flex-col gap-1 text-sm" htmlFor={`${fieldId}-table-title`}>
        <span className="font-medium text-foreground">Heading</span>
        <Input
          id={`${fieldId}-table-title`}
          type="text"
          value={section.title}
          maxLength={NOTEBOOK_SECTION_TITLE_MAX}
          onChange={(event) => onFieldChange({ ...section, title: event.target.value })}
        />
      </label>
    </div>
  );
}

/**
 * The tier rollup's only author decisions.
 *
 * There is no column picker here on purpose: the rollup's columns, labels and
 * accent mapping are declared by the query layer and travel with the data, so
 * the only thing left for an author is what to call the block and what to say
 * about it. A picker would put a second copy of that decision in every spec.
 */
function TiersFields({
  fieldId,
  section,
  onFieldChange,
}: {
  fieldId: string;
  section: NotebookTiersSection;
  onFieldChange: (next: NotebookTiersSection) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm" htmlFor={`${fieldId}-tiers-title`}>
        <span className="font-medium text-foreground">Heading</span>
        <Input
          id={`${fieldId}-tiers-title`}
          type="text"
          value={section.title}
          maxLength={NOTEBOOK_SECTION_TITLE_MAX}
          onChange={(event) => onFieldChange({ ...section, title: event.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm" htmlFor={`${fieldId}-tiers-description`}>
        <span className="font-medium text-foreground">
          Standfirst <span className="text-muted-foreground">(optional)</span>
        </span>
        <Textarea
          id={`${fieldId}-tiers-description`}
          value={section.description ?? ""}
          maxLength={NOTEBOOK_SECTION_DESCRIPTION_MAX}
          onChange={(event) =>
            onFieldChange({
              ...section,
              description: event.target.value.trim() === "" ? undefined : event.target.value,
            })
          }
        />
      </label>

      <p className="text-xs text-muted-foreground">
        Four rows, one per kernel tier, over a fixed 90-day window. Columns and their labels come
        from the kernel data itself.
      </p>
    </div>
  );
}

function TextFields({
  fieldId,
  section,
  onFieldChange,
}: {
  /** Unique per section, so repeated forms do not share label targets. */
  fieldId: string;
  section: NotebookTextSection;
  onFieldChange: (next: NotebookTextSection) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm" htmlFor={`${fieldId}-text-title`}>
        <span className="font-medium text-foreground">
          Heading <span className="text-muted-foreground">(optional)</span>
        </span>
        <Input
          id={`${fieldId}-text-title`}
          type="text"
          value={section.title ?? ""}
          maxLength={NOTEBOOK_SECTION_TITLE_MAX}
          onChange={(event) =>
            onFieldChange({
              ...section,
              // An emptied heading means "no heading", not an empty one — the
              // schema rejects a blank string but accepts its absence.
              title: event.target.value.trim() === "" ? undefined : event.target.value,
            })
          }
        />
      </label>

      <label className="flex flex-col gap-1 text-sm" htmlFor={`${fieldId}-text-body`}>
        <span className="font-medium text-foreground">Text</span>
        <Textarea
          id={`${fieldId}-text-body`}
          value={section.body}
          maxLength={NOTEBOOK_TEXT_BODY_MAX}
          placeholder="Explain what this page shows and how to read it."
          onChange={(event) => onFieldChange({ ...section, body: event.target.value })}
        />
        {/* Stated plainly because an author will reasonably assume otherwise:
            this renders as plain text, so markdown or HTML pasted here shows
            up as the characters typed. */}
        <span className="text-xs text-muted-foreground">
          Plain text only — formatting and links are not rendered.
        </span>
      </label>
    </div>
  );
}

function KpiFields({
  fieldId,
  section,
  onToggle,
}: {
  fieldId: string;
  section: NotebookKpisSection;
  onToggle: (metric: (typeof NOTEBOOK_KPI_METRICS)[number]) => void;
}) {
  const onlyOne = section.metrics.length === 1;

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm text-muted-foreground">
        Which figures to show, in the order you tick them.
      </legend>
      <div className="flex flex-row flex-wrap gap-4">
        {NOTEBOOK_KPI_METRICS.map((metric) => {
          const checked = section.metrics.includes(metric);
          return (
            <label
              key={metric}
              htmlFor={`${fieldId}-kpi-${metric}`}
              className="flex flex-row items-center gap-2 text-sm text-foreground"
            >
              <Checkbox
                id={`${fieldId}-kpi-${metric}`}
                checked={checked}
                // The last remaining metric cannot be unticked: an empty KPI
                // row renders nothing and the server rejects it, so this keeps
                // the author in a state that can actually be saved.
                disabled={checked && onlyOne}
                onCheckedChange={() => onToggle(metric)}
              />
              {NOTEBOOK_KPI_METRIC_LABELS[metric]}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function BarFields({
  fieldId,
  section,
  onSourceChange,
  onFieldChange,
}: {
  fieldId: string;
  section: NotebookBarsSection;
  onSourceChange: (source: (typeof NOTEBOOK_BAR_SOURCES)[number]) => void;
  onFieldChange: (next: NotebookBarsSection) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm" htmlFor={`${fieldId}-bar-source`}>
        <span className="font-medium text-foreground">Data</span>
        <Select
          value={section.source}
          onValueChange={(value) => onSourceChange(value as (typeof NOTEBOOK_BAR_SOURCES)[number])}
        >
          <SelectTrigger id={`${fieldId}-bar-source`} aria-label="Data">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NOTEBOOK_BAR_SOURCES.map((source) => (
              <SelectItem key={source} value={source}>
                {NOTEBOOK_BAR_SOURCE_LABELS[source]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* The metric is derived, not chosen: each source expresses exactly
            one series, so offering it as a second dropdown would imply a
            choice that does not exist. Stated so the author knows what they
            will get. */}
        <span className="text-xs text-muted-foreground">
          Shows: {NOTEBOOK_BAR_METRIC_LABELS[section.metric]}
        </span>
      </label>

      <label className="flex flex-col gap-1 text-sm" htmlFor={`${fieldId}-bar-title`}>
        <span className="font-medium text-foreground">Heading</span>
        <Input
          id={`${fieldId}-bar-title`}
          type="text"
          value={section.title}
          maxLength={NOTEBOOK_SECTION_TITLE_MAX}
          onChange={(event) => onFieldChange({ ...section, title: event.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm" htmlFor={`${fieldId}-bar-description`}>
        <span className="font-medium text-foreground">
          Description <span className="text-muted-foreground">(optional)</span>
        </span>
        <Textarea
          id={`${fieldId}-bar-description`}
          value={section.description ?? ""}
          maxLength={NOTEBOOK_SECTION_DESCRIPTION_MAX}
          onChange={(event) =>
            onFieldChange({
              ...section,
              // An emptied field means "no description", not an empty one —
              // the schema rejects a blank string but accepts its absence.
              description: event.target.value.trim() === "" ? undefined : event.target.value,
            })
          }
        />
      </label>
    </div>
  );
}
