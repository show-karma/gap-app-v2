"use client";

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
import type {
  NotebookMetricCatalog,
  NotebookMetricDefinition,
  NotebookMetricFilterDefinition,
} from "@/services/notebooks/notebook-metric-registry.types";
import {
  NOTEBOOK_SECTION_DESCRIPTION_MAX,
  NOTEBOOK_SECTION_TITLE_MAX,
  type NotebookQueryDimension,
  type NotebookQuerySection,
  type NotebookQueryWindow,
} from "@/services/notebooks/notebook-spec";

/**
 * Composing a catalogue query onto a page.
 *
 * The same rule the explorer follows, in the place where the choice is
 * PERSISTED: every option comes from the community's catalogue, so an author
 * cannot store a question the server would refuse to answer. The picker is
 * narrower than the schema on purpose — the schema has to accept what is
 * already stored, the picker only has to offer what is currently askable.
 *
 * A metric the catalogue no longer publishes stays VISIBLE as the current
 * selection rather than silently resetting to the first option. Silently
 * rewriting an author's stored choice is how a page changes meaning without
 * anyone deciding to change it; showing it as unavailable lets them choose.
 */

const DIMENSION_LABELS: Partial<Record<NotebookQueryDimension, string>> = {
  none: "No grouping (one total)",
};

const WINDOW_LABELS: Partial<Record<NotebookQueryWindow, string>> = {
  all: "All time",
};

/** The filters this metric offers for the chosen grouping. */
function offerableFilters(
  metric: NotebookMetricDefinition,
  groupBy: NotebookQueryDimension
): NotebookMetricFilterDefinition[] {
  return metric.filters.filter(
    (filter) => !filter.dimensions || filter.dimensions.includes(groupBy)
  );
}

function filterOptions(
  filter: NotebookMetricFilterDefinition,
  catalog: NotebookMetricCatalog
): Array<{ id: string; label: string }> | null {
  switch (filter.optionsSource) {
    case "programs":
      return catalog.options.programs.map((program) => ({ id: program.id, label: program.label }));
    case "aggregations":
      return catalog.options.aggregations.map((value) => ({ id: value, label: value }));
    case "kernel-tiers":
      return catalog.options.kernelTiers.map((tier) => ({ id: tier, label: tier }));
    default:
      // `projects` publishes no list, so nothing could validate a stored id —
      // the spec schema does not accept `projectUIDs` at all. See issue #2092.
      return null;
  }
}

export function QueryFields({
  fieldId,
  section,
  catalog,
  onFieldChange,
}: {
  fieldId: string;
  section: NotebookQuerySection;
  catalog: NotebookMetricCatalog;
  onFieldChange: (next: NotebookQuerySection) => void;
}) {
  const metric = catalog.items.find((item) => item.id === section.metricId);
  const known = Boolean(metric);

  const chooseMetric = (metricId: string) => {
    const next = catalog.items.find((item) => item.id === metricId);
    // Grouping, window and filters all belonged to the previous metric. Carried
    // across they would store a question this metric cannot be asked.
    onFieldChange({
      ...section,
      metricId,
      groupBy: next?.dimensions[0] ?? "none",
      window: (next?.windows.default as NotebookQueryWindow) ?? "90d",
      filters: undefined,
    });
  };

  const chooseGrouping = (groupBy: NotebookQueryDimension) => {
    if (!metric) {
      onFieldChange({ ...section, groupBy });
      return;
    }
    const offerable = new Set(offerableFilters(metric, groupBy).map((filter) => filter.id));
    const filters = Object.fromEntries(
      Object.entries(section.filters ?? {}).filter(([id]) => offerable.has(id as never))
    ) as NotebookQuerySection["filters"];
    onFieldChange({
      ...section,
      groupBy,
      filters: filters && Object.keys(filters).length > 0 ? filters : undefined,
    });
  };

  const toggleValue = (id: "programIds" | "tier" | "category", value: string) => {
    const selected = section.filters?.[id] ?? [];
    const next = selected.includes(value)
      ? selected.filter((entry) => entry !== value)
      : [...selected, value];
    onFieldChange({
      ...section,
      filters: { ...section.filters, [id]: next.length > 0 ? next : undefined },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm" htmlFor={`${fieldId}-query-metric`}>
        <span className="font-medium text-foreground">Metric</span>
        <Select value={section.metricId} onValueChange={chooseMetric}>
          <SelectTrigger id={`${fieldId}-query-metric`} aria-label="Metric">
            <SelectValue placeholder="Choose a metric…" />
          </SelectTrigger>
          <SelectContent>
            {!known && section.metricId ? (
              <SelectItem value={section.metricId}>
                {section.metricId} (not in this community&apos;s catalogue)
              </SelectItem>
            ) : null}
            {catalog.items.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {metric ? (
          <span className="text-xs text-muted-foreground">{metric.description}</span>
        ) : null}
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${fieldId}-query-groupby`}>
          <span className="font-medium text-foreground">Group by</span>
          <Select value={section.groupBy} onValueChange={(value) => chooseGrouping(value as never)}>
            <SelectTrigger id={`${fieldId}-query-groupby`} aria-label="Group by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(metric?.dimensions ?? [section.groupBy]).map((dimension) => (
                <SelectItem key={dimension} value={dimension}>
                  {DIMENSION_LABELS[dimension as NotebookQueryDimension] ?? dimension}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="flex flex-col gap-1 text-sm" htmlFor={`${fieldId}-query-window`}>
          <span className="font-medium text-foreground">Window</span>
          <Select
            value={section.window}
            onValueChange={(value) => onFieldChange({ ...section, window: value as never })}
          >
            <SelectTrigger id={`${fieldId}-query-window`} aria-label="Window">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(metric?.windows.allowed ?? [section.window]).map((allowed) => (
                <SelectItem key={allowed} value={allowed}>
                  {WINDOW_LABELS[allowed as NotebookQueryWindow] ?? allowed}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      {metric
        ? offerableFilters(metric, section.groupBy).map((filter) => {
            const options = filterOptions(filter, catalog);
            if (!options || options.length === 0) return null;

            if (filter.kind === "single-select") {
              return (
                <label
                  key={filter.id}
                  className="flex flex-col gap-1 text-sm"
                  htmlFor={`${fieldId}-query-${filter.id}`}
                >
                  <span className="font-medium text-foreground">{filter.label}</span>
                  <Select
                    value={section.filters?.aggregation ?? ""}
                    onValueChange={(value) =>
                      onFieldChange({
                        ...section,
                        filters: { ...section.filters, aggregation: value as never },
                      })
                    }
                  >
                    <SelectTrigger id={`${fieldId}-query-${filter.id}`} aria-label={filter.label}>
                      <SelectValue placeholder="Default" />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              );
            }

            if (filter.kind === "boolean") {
              return (
                <label
                  key={filter.id}
                  htmlFor={`${fieldId}-query-${filter.id}`}
                  className="flex flex-row items-center gap-2 text-sm text-foreground"
                >
                  <Checkbox
                    id={`${fieldId}-query-${filter.id}`}
                    checked={section.filters?.inScope === true}
                    onCheckedChange={(checked) =>
                      onFieldChange({
                        ...section,
                        filters: {
                          ...section.filters,
                          inScope: checked === true ? true : undefined,
                        },
                      })
                    }
                  />
                  {filter.label}
                </label>
              );
            }

            const id = filter.id as "programIds" | "tier" | "category";
            return (
              <fieldset key={filter.id} className="flex flex-col gap-2">
                <legend className="text-sm font-medium text-foreground">{filter.label}</legend>
                <div className="flex max-h-40 flex-col gap-2 overflow-y-auto">
                  {options.map((option) => (
                    <label
                      key={option.id}
                      htmlFor={`${fieldId}-query-${filter.id}-${option.id}`}
                      className="flex flex-row items-center gap-2 text-sm text-foreground"
                    >
                      <Checkbox
                        id={`${fieldId}-query-${filter.id}-${option.id}`}
                        checked={(section.filters?.[id] ?? []).includes(option.id)}
                        onCheckedChange={() => toggleValue(id, option.id)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          })
        : null}

      <label className="flex flex-col gap-1 text-sm" htmlFor={`${fieldId}-query-title`}>
        <span className="font-medium text-foreground">Heading</span>
        <Input
          id={`${fieldId}-query-title`}
          type="text"
          value={section.title}
          maxLength={NOTEBOOK_SECTION_TITLE_MAX}
          onChange={(event) => onFieldChange({ ...section, title: event.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm" htmlFor={`${fieldId}-query-description`}>
        <span className="font-medium text-foreground">
          Standfirst <span className="text-muted-foreground">(optional)</span>
        </span>
        <Textarea
          id={`${fieldId}-query-description`}
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
    </div>
  );
}
