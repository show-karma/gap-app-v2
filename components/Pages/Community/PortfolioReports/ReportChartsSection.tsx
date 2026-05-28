"use client";

import { Card, Text, Title } from "@tremor/react";
import { LayoutList, LineChart as LineIcon, RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { ChartSkeleton } from "@/components/Utilities/ChartSkeleton";
import { Button } from "@/components/ui/button";
import { useReportCharts } from "@/hooks/portfolio-reports/usePortfolioReports";
import type { ChartSectionIndicator, ChartSectionProject } from "@/types/portfolio-report";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";

const AreaChart = dynamic(() => import("@tremor/react").then((mod) => mod.AreaChart), {
  ssr: false,
  loading: () => <ChartSkeleton height="h-10" />,
});

const LineChart = dynamic(() => import("@tremor/react").then((mod) => mod.LineChart), {
  ssr: false,
  loading: () => <ChartSkeleton height="h-72" />,
});

interface Props {
  communitySlug: string;
  reportId: string;
  authenticated?: boolean;
}

export function ReportChartsSection({ communitySlug, reportId, authenticated = true }: Props) {
  const { data, isLoading, isError, isFetching, refetch } = useReportCharts(
    communitySlug,
    reportId,
    { authenticated }
  );

  if (isLoading) {
    return (
      <section className="mt-4" aria-label="Report metrics">
        <Card className="bg-white">
          <Title className="!text-xl !text-zinc-900">Metrics</Title>
          <div className="mt-4">
            <ChartSkeleton height="h-48" />
          </div>
        </Card>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="mt-4" aria-label="Report metrics">
        <Card className="bg-white">
          <Title className="!text-xl !text-zinc-900">Metrics</Title>
          <Text className="mt-2 !text-sm !text-zinc-500">Couldn&apos;t load charts.</Text>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn("mr-1 h-3 w-3", isFetching && "animate-spin")} />
            {isFetching ? "Retrying…" : "Retry"}
          </Button>
        </Card>
      </section>
    );
  }

  if (!data || data.indicators.length === 0) {
    return null;
  }

  // One outer Card wraps the whole Charts section so it reads as a single
  // "document" block — matching the LLM-generated report HTML above it,
  // which is always rendered light inside its Shadow DOM. Individual
  // indicator blocks are simple bordered <article>s inside the same card.
  return (
    <section className="mt-8" aria-label="Report metrics">
      <Card className="bg-white">
        <header className="mb-6">
          <Title className="!text-xl !text-zinc-900">Metrics</Title>
          <Text className="!text-sm !text-zinc-500">
            {formatDateRange(data.startDate, data.endDate)}
          </Text>
        </header>

        <div>
          {data.indicators.map((indicator) => (
            <IndicatorBlock key={indicator.id} indicator={indicator} />
          ))}
        </div>
      </Card>
    </section>
  );
}

type ViewMode = "rows" | "combined";

interface IndicatorBlockProps {
  indicator: ChartSectionIndicator;
}

function IndicatorBlock({ indicator }: IndicatorBlockProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("rows");

  const projectsWithData = useMemo(
    () => indicator.projects.filter((p) => p.points.length > 0),
    [indicator.projects]
  );

  // Each metric block is a flat section inside the outer Metrics Card.
  // The top border (skipped on the first block) gives a clean "this
  // metric ends, the next one starts" cue without nesting another card.
  // Generous py-8 above the rule + below the rule = ~64px between
  // adjacent metrics, matching the LLM report's section rhythm.
  return (
    <article className="report-print-no-break border-t border-zinc-200 pt-8 first:border-t-0 first:pt-0 [&:not(:last-child)]:pb-8">
      <div className="flex items-start justify-between gap-4">
        <Title className="!text-base !text-zinc-900">
          {indicator.name}
          {indicator.unit && (
            <span className="ml-2 text-sm font-normal text-zinc-500">({indicator.unit})</span>
          )}
        </Title>
        {projectsWithData.length > 0 && <ViewModeToggle value={viewMode} onChange={setViewMode} />}
      </div>

      {projectsWithData.length === 0 ? (
        <Text className="mt-4 !text-sm !text-zinc-500">
          No datapoints recorded for the selected projects in this date range.
        </Text>
      ) : viewMode === "rows" ? (
        <RowsView projects={projectsWithData} />
      ) : (
        <CombinedView projects={projectsWithData} />
      )}
    </article>
  );
}

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (next: ViewMode) => void;
}

function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  return (
    <div
      role="toolbar"
      aria-label="Chart layout"
      className="report-print-hide inline-flex flex-shrink-0 items-center rounded-md border border-zinc-200 bg-white p-0.5"
    >
      <ToggleButton
        active={value === "rows"}
        onClick={() => onChange("rows")}
        label="One row per project"
      >
        <LayoutList className="h-4 w-4" />
      </ToggleButton>
      <ToggleButton
        active={value === "combined"}
        onClick={() => onChange("combined")}
        label="Combined chart"
      >
        <LineIcon className="h-4 w-4" />
      </ToggleButton>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded transition-colors",
        active ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700"
      )}
    >
      {children}
    </button>
  );
}

// ── Rows view ───────────────────────────────────────────────

interface RowsViewProps {
  projects: ChartSectionProject[];
}

function RowsView({ projects }: RowsViewProps) {
  const sorted = useMemo(
    () => projects.toSorted((a, b) => latestValue(b) - latestValue(a)),
    [projects]
  );

  return (
    <ul className="mt-4 divide-y divide-zinc-100">
      {sorted.map((project, idx) => (
        <ProjectRow key={project.uid} project={project} showAxis={idx === sorted.length - 1} />
      ))}
    </ul>
  );
}

interface ProjectRowProps {
  project: ChartSectionProject;
  /** When true, the row reveals the chart's x-axis — used on the last
   *  row so it acts as a shared bottom axis for the whole card. */
  showAxis: boolean;
}

function ProjectRow({ project, showAxis }: ProjectRowProps) {
  const chartData = useMemo(() => {
    // Dedupe by formatted label — two raw dates can collapse to the same
    // "MMM D" (e.g. multiple samples on the same day, or cross-year ticks),
    // which Tremor would render as duplicate-keyed children.
    const byLabel = new Map<string, { date: string; [k: string]: string | number }>();
    for (const p of project.points) {
      const label = formatDate(p.date, "UTC", "MMM D");
      byLabel.set(label, { date: label, [project.title]: p.value });
    }
    return Array.from(byLabel.values());
  }, [project.points, project.title]);

  const latest = latestValue(project);
  const summary = formatValue(latest);

  return (
    <li className={cn("flex items-center gap-4", showAxis ? "pt-2 pb-1" : "py-2")}>
      <div
        className="flex w-52 flex-shrink-0 items-baseline gap-2 overflow-hidden text-sm text-zinc-800"
        title={project.title}
      >
        <span className="min-w-0 flex-1 truncate font-medium">{project.title}</span>
        <span className="flex-shrink-0 text-xs font-normal tabular-nums text-zinc-500">
          {summary}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <AreaChart
          data={chartData}
          index="date"
          categories={[project.title]}
          colors={["blue"]}
          showLegend={false}
          showXAxis={showAxis}
          showYAxis={false}
          showGridLines={false}
          showAnimation
          startEndOnly={showAxis}
          autoMinValue
          valueFormatter={(v) => formatValue(v)}
          className={showAxis ? "h-16 w-full" : "h-10 w-full"}
        />
      </div>
    </li>
  );
}

// ── Combined view ─────────────────────────────────────────────

interface CombinedViewProps {
  projects: ChartSectionProject[];
}

interface CombinedRow {
  date: string;
  [projectTitle: string]: string | number | null;
}

function CombinedView({ projects }: CombinedViewProps) {
  const { rows, categories } = useMemo(() => buildCombined(projects), [projects]);

  if (rows.length === 0) {
    return (
      <Text className="mt-4 !text-sm !text-zinc-500">
        No comparable datapoints across projects.
      </Text>
    );
  }

  return (
    <LineChart
      className="mt-4 h-72"
      data={rows}
      index="date"
      categories={categories}
      colors={SERIES_COLORS}
      valueFormatter={(v) => formatValue(v)}
      showLegend
      showGridLines
      showAnimation
      yAxisWidth={64}
      connectNulls
    />
  );
}

const SERIES_COLORS = [
  "blue",
  "emerald",
  "violet",
  "amber",
  "rose",
  "cyan",
  "indigo",
  "orange",
  "pink",
  "teal",
  "fuchsia",
  "lime",
];

function buildCombined(projects: ChartSectionProject[]): {
  rows: CombinedRow[];
  categories: string[];
} {
  // Resolve unique column names per project (handles duplicate titles).
  const seen = new Map<string, number>();
  const columnByUid = new Map<string, string>();
  for (const project of projects) {
    const base = project.title || project.uid;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    columnByUid.set(project.uid, count === 1 ? base : `${base} (${count})`);
  }

  // Union of dates across all projects.
  const dateSet = new Set<string>();
  for (const project of projects) {
    for (const point of project.points) {
      dateSet.add(point.date);
    }
  }
  const sortedDates = Array.from(dateSet).sort();

  // (uid, date) → value lookup.
  const lookup = new Map<string, Map<string, number>>();
  for (const project of projects) {
    const inner = new Map<string, number>();
    for (const point of project.points) {
      inner.set(point.date, point.value);
    }
    lookup.set(project.uid, inner);
  }

  // Build rows keyed by formatted label so two ISO dates that collapse to the
  // same "MMM D" merge into one row instead of becoming duplicate keys.
  const rowsByLabel = new Map<string, CombinedRow>();
  for (const date of sortedDates) {
    const label = formatDate(date, "UTC", "MMM D");
    const row: CombinedRow = rowsByLabel.get(label) ?? { date: label };
    for (const project of projects) {
      const column = columnByUid.get(project.uid)!;
      const value = lookup.get(project.uid)?.get(date);
      if (value !== undefined) row[column] = value;
      else if (!(column in row)) row[column] = null;
    }
    rowsByLabel.set(label, row);
  }
  const rows: CombinedRow[] = Array.from(rowsByLabel.values());

  return { rows, categories: Array.from(columnByUid.values()) };
}

// ── Helpers ───────────────────────────────────────────────

function latestValue(project: ChartSectionProject): number {
  if (project.points.length === 0) return 0;
  return project.points[project.points.length - 1].value;
}

/**
 * Compact number format with no trailing `.0` (so `2k` not `2.0k`, `1.5k`
 * stays `1.5k`). The indicator's unit is shown in the card title — we
 * deliberately don't append it here because Tremor reuses this formatter
 * for axis ticks AND tooltips, and repeating the unit on every tick is
 * noisy.
 */
function formatValue(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${trimTrailingZero((value / 1_000_000_000).toFixed(1))}B`;
  if (abs >= 1_000_000) return `${trimTrailingZero((value / 1_000_000).toFixed(1))}M`;
  if (abs >= 1_000) return `${trimTrailingZero((value / 1_000).toFixed(1))}k`;
  if (Number.isInteger(value)) return value.toString();
  return trimTrailingZero(value.toFixed(2));
}

function trimTrailingZero(s: string): string {
  // "2.0" → "2", "1.50" → "1.5", "1.55" → "1.55"
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

/**
 * Human-readable date range. Same year → "Jan 1 – May 28, 2026". Different
 * years → "Dec 15, 2025 – May 28, 2026". Defers to the shared `formatDate`
 * util, which auto-detects YYYY-MM-DD strings and forces UTC display so the
 * viewer's local timezone doesn't shift the date boundary.
 */
function formatDateRange(startIso: string, endIso: string): string {
  const startYear = startIso.slice(0, 4);
  const endYear = endIso.slice(0, 4);
  const endLabel = formatDate(endIso, "UTC", "MMM D, YYYY");
  if (startYear === endYear) {
    return `${formatDate(startIso, "UTC", "MMM D")} – ${endLabel}`;
  }
  return `${formatDate(startIso, "UTC", "MMM D, YYYY")} – ${endLabel}`;
}
