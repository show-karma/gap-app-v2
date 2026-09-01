"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  NotebookMetricCatalog,
  NotebookMetricDefinition,
  NotebookMetricDimension,
  NotebookMetricFilterDefinition,
  NotebookMetricQueryFilters,
  NotebookMetricQueryResult,
  NotebookMetricWindow,
} from "@/services/notebooks/notebook-metric-registry.types";

/**
 * The query builder: pick a metric, a grouping, a window and its filters, and
 * see what the numbers actually are before putting them on a page.
 *
 * IT OFFERS ONLY WHAT THE CATALOG DECLARES. The metric list, each metric's
 * groupings, its allowed windows, its filters and their option lists all come
 * from the community-scoped catalog — nothing here is a hard-coded vocabulary.
 * So a metric that gains a dimension upstream becomes selectable with no change
 * to this file, and one that loses a filter stops being offered rather than
 * producing a request the server refuses.
 *
 * THE CATALOG IS ALREADY COMMUNITY-SCOPED. Cross-community metrics never reach
 * this component, so there is no filtering to do here and no opportunity to
 * forget it — the same reason the indicator picker narrows server-side.
 *
 * IT RE-FORMATS NOTHING. Every cell renders the row's own `displayValue`, which
 * the query layer produced and reconciled — including the em-dash for an absent
 * figure. A second formatting opinion here is exactly how a preview comes to
 * disagree with the page it is previewing.
 */

interface Props {
  communityId: string;
  catalog: NotebookMetricCatalog;
}

type Status =
  | { state: "idle" }
  | { state: "running" }
  | { state: "failed"; message: string }
  | { state: "done"; result: NotebookMetricQueryResult };

/** A filter's current value, only for the filters this metric declares. */
function pruneFilters(
  filters: NotebookMetricQueryFilters,
  metric: NotebookMetricDefinition,
  groupBy: NotebookMetricDimension
): NotebookMetricQueryFilters {
  const offerable = new Set(
    metric.filters
      // A filter can be declared for particular groupings only — "aggregation"
      // means nothing when every row is its own program. Dropping it as the
      // grouping changes keeps the request honest instead of sending a value
      // the author can no longer see.
      .filter((filter) => !filter.dimensions || filter.dimensions.includes(groupBy))
      .map((filter) => filter.id)
  );
  return Object.fromEntries(
    Object.entries(filters).filter(([id]) => offerable.has(id as never))
  ) as NotebookMetricQueryFilters;
}

function offerableFilters(
  metric: NotebookMetricDefinition,
  groupBy: NotebookMetricDimension
): NotebookMetricFilterDefinition[] {
  return metric.filters.filter(
    (filter) => !filter.dimensions || filter.dimensions.includes(groupBy)
  );
}

/** The option list a filter draws on, or null when the catalog publishes none. */
function filterOptions(
  filter: NotebookMetricFilterDefinition,
  catalog: NotebookMetricCatalog
): Array<{ id: string; label: string }> | null {
  switch (filter.optionsSource) {
    case "programs":
      return catalog.options.programs.map((program) => ({
        id: program.id,
        label: program.label,
      }));
    case "aggregations":
      return catalog.options.aggregations.map((value) => ({ id: value, label: value }));
    case "kernel-tiers":
      return catalog.options.kernelTiers.map((tier) => ({ id: tier, label: tier }));
    default:
      // `projects` has no published list, and neither does an undeclared
      // source. Rather than invent one, the filter is simply not offered —
      // a picker with nothing in it teaches an author the wrong thing.
      return null;
  }
}

function MultiSelectFilter({
  filter,
  options,
  selected,
  onToggle,
}: {
  filter: NotebookMetricFilterDefinition;
  options: Array<{ id: string; label: string }>;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-foreground">
        {filter.label}
        {filter.required ? "" : " (optional)"}
      </legend>
      <div className="flex max-h-40 flex-col gap-2 overflow-y-auto">
        {options.map((option) => (
          <label
            key={option.id}
            htmlFor={`filter-${filter.id}-${option.id}`}
            className="flex flex-row items-center gap-2 text-sm text-foreground"
          >
            <Checkbox
              id={`filter-${filter.id}-${option.id}`}
              checked={selected.includes(option.id)}
              onCheckedChange={() => onToggle(option.id)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ResultTable({ result }: { result: NotebookMetricQueryResult }) {
  if (result.rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This query returned no rows. That is an answer, not an error — nothing matched the filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            {result.columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                className={`whitespace-nowrap px-3 py-2 font-medium text-muted-foreground ${
                  column.valueKind === "text" ? "text-left" : "text-right"
                }`}
              >
                {column.label}
                {column.unit ? ` (${column.unit})` : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row) => (
            <tr key={row.key} className="border-b border-border/60 last:border-0">
              {result.columns.map((column) => (
                <td
                  key={column.id}
                  className={`px-3 py-2 text-foreground ${
                    column.valueKind === "text" ? "text-left" : "text-right tabular-nums"
                  }`}
                >
                  {/* The label column is the row's identity; every other column
                      is the measure, already formatted by the query layer. */}
                  {column.valueKind === "text" ? row.label : row.displayValue}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MetricQueryBuilder({ communityId, catalog }: Props) {
  const [metricId, setMetricId] = useState<string>(catalog.items[0]?.id ?? "");
  const metric = useMemo(
    () => catalog.items.find((item) => item.id === metricId),
    [catalog.items, metricId]
  );

  const [groupBy, setGroupBy] = useState<NotebookMetricDimension>(
    catalog.items[0]?.dimensions[0] ?? "none"
  );
  const [window, setWindow] = useState<NotebookMetricWindow>(
    catalog.items[0]?.windows.default ?? "90d"
  );
  const [filters, setFilters] = useState<NotebookMetricQueryFilters>({});
  const [status, setStatus] = useState<Status>({ state: "idle" });

  // Changing the metric resets the choices that belonged to the old one. They
  // are not merely invalid — a window carried across from another metric would
  // be silently refused by the route, which reads as the builder being broken.
  const chooseMetric = (nextId: string) => {
    const next = catalog.items.find((item) => item.id === nextId);
    setMetricId(nextId);
    setGroupBy(next?.dimensions[0] ?? "none");
    setWindow(next?.windows.default ?? "90d");
    setFilters({});
    setStatus({ state: "idle" });
  };

  const chooseGrouping = (next: NotebookMetricDimension) => {
    setGroupBy(next);
    if (metric) setFilters((current) => pruneFilters(current, metric, next));
  };

  const toggleValue = (id: "programIds" | "tier" | "category", value: string) => {
    setFilters((current) => {
      const selected = current[id] ?? [];
      const next = selected.includes(value)
        ? selected.filter((entry) => entry !== value)
        : [...selected, value];
      return { ...current, [id]: next.length > 0 ? next : undefined };
    });
  };

  const run = async () => {
    if (!metric) return;
    setStatus({ state: "running" });
    try {
      const response = await fetch("/api/notebooks/metrics/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communityId,
          metricId: metric.id,
          groupBy,
          window,
          ...(Object.keys(filters).length > 0 ? { filters } : {}),
        }),
      });
      const body = await response.json();
      if (!response.ok || !body?.ok) {
        // The route says WHICH thing was not offerable; passing that through
        // is the difference between a fixable message and "something failed".
        setStatus({ state: "failed", message: body?.error ?? "Query failed" });
        return;
      }
      setStatus({ state: "done", result: body.result as NotebookMetricQueryResult });
    } catch {
      setStatus({ state: "failed", message: "Could not reach the query service" });
    }
  };

  if (catalog.items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">This community has no metrics catalogued yet.</p>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-foreground">Explore the data</h2>
        <p className="text-sm text-muted-foreground">
          Run a metric and see the figures before you put them on a page. Nothing here changes the
          page.
        </p>
      </div>

      {catalog.freshness.stale ? (
        // Said plainly rather than hidden: an author comparing this against a
        // live dashboard deserves to know which one is behind.
        <output className="text-xs text-warning-700">
          Showing the last catalogue we could load. It may be out of date.
        </output>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm" htmlFor="metric-query-metric">
          <span className="font-medium text-foreground">Metric</span>
          <Select value={metricId} onValueChange={chooseMetric}>
            <SelectTrigger id="metric-query-metric" aria-label="Metric">
              <SelectValue placeholder="Choose a metric…" />
            </SelectTrigger>
            <SelectContent>
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

        <label className="flex flex-col gap-1 text-sm" htmlFor="metric-query-groupby">
          <span className="font-medium text-foreground">Group by</span>
          <Select value={groupBy} onValueChange={(value) => chooseGrouping(value as never)}>
            <SelectTrigger id="metric-query-groupby" aria-label="Group by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(metric?.dimensions ?? []).map((dimension) => (
                <SelectItem key={dimension} value={dimension}>
                  {dimension === "none" ? "No grouping (one total)" : dimension}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="flex flex-col gap-1 text-sm" htmlFor="metric-query-window">
          <span className="font-medium text-foreground">Window</span>
          <Select value={window} onValueChange={(value) => setWindow(value as never)}>
            <SelectTrigger id="metric-query-window" aria-label="Window">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(metric?.windows.allowed ?? []).map((allowed) => (
                <SelectItem key={allowed} value={allowed}>
                  {allowed === "all" ? "All time" : allowed}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      {metric
        ? offerableFilters(metric, groupBy).map((filter) => {
            const options = filterOptions(filter, catalog);
            if (!options || options.length === 0) return null;

            if (filter.kind === "single-select") {
              return (
                <label
                  key={filter.id}
                  className="flex flex-col gap-1 text-sm"
                  htmlFor={`filter-${filter.id}`}
                >
                  <span className="font-medium text-foreground">{filter.label}</span>
                  <Select
                    value={filters.aggregation ?? ""}
                    onValueChange={(value) =>
                      setFilters((current) => ({ ...current, aggregation: value as never }))
                    }
                  >
                    <SelectTrigger id={`filter-${filter.id}`} aria-label={filter.label}>
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
                  htmlFor={`filter-${filter.id}`}
                  className="flex flex-row items-center gap-2 text-sm text-foreground"
                >
                  <Checkbox
                    id={`filter-${filter.id}`}
                    checked={filters.inScope === true}
                    onCheckedChange={(checked) =>
                      setFilters((current) => ({
                        ...current,
                        inScope: checked === true ? true : undefined,
                      }))
                    }
                  />
                  {filter.label}
                </label>
              );
            }

            return (
              <MultiSelectFilter
                key={filter.id}
                filter={filter}
                options={options}
                selected={filters[filter.id as "programIds" | "tier" | "category"] ?? []}
                onToggle={(value) =>
                  toggleValue(filter.id as "programIds" | "tier" | "category", value)
                }
              />
            );
          })
        : null}

      <div className="flex flex-row items-center gap-3">
        <Button type="button" onClick={run} disabled={!metric || status.state === "running"}>
          {status.state === "running" ? "Running…" : "Run query"}
        </Button>
        {status.state === "failed" ? (
          <p role="alert" className="text-sm text-destructive">
            {status.message}
          </p>
        ) : null}
      </div>

      {status.state === "done" ? (
        <div className="flex flex-col gap-3">
          {status.result.meta.stale ? (
            <output className="text-xs text-warning-700">
              Showing the last good result for this query. The live figures could not be loaded.
            </output>
          ) : null}

          {status.result.meta.warnings.map((warning) => (
            <output key={warning} className="text-xs text-warning-700">
              {warning}
            </output>
          ))}

          <ResultTable result={status.result} />

          {/* Provenance travels with the preview, because an author about to
              publish a figure is exactly who needs to know how it was
              computed and from where. */}
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <p>{status.result.meta.source.methodology}</p>
            <p>
              {status.result.meta.source.tool} · {status.result.meta.source.endpoints.join(", ")}
            </p>
            {status.result.meta.source.canonicalNotes?.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
