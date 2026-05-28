"use client";

import { Card, Text, Title } from "@tremor/react";
import { LayoutList, LineChart as LineIcon, RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { ChartSkeleton } from "@/components/Utilities/ChartSkeleton";
import { Button } from "@/components/ui/button";
import { useReportCharts } from "@/hooks/portfolio-reports/usePortfolioReports";
import type { ChartSectionIndicator, ChartSectionProject } from "@/types/portfolio-report";
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
      <section className="mt-8 space-y-4" aria-label="Report charts">
        <Title className="!text-xl">Charts</Title>
        <ChartSkeleton height="h-48" />
      </section>
    );
  }

  if (isError) {
    return (
      <section className="mt-8" aria-label="Report charts">
        <Title className="!text-xl">Charts</Title>
        <Text className="mt-2 !text-sm text-zinc-500">Couldn&apos;t load charts.</Text>
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
      </section>
    );
  }

  if (!data || data.indicators.length === 0) {
    return null;
  }

  return (
    <section className="mt-8 space-y-6" aria-label="Report charts">
      <header>
        <Title className="!text-xl">Charts</Title>
        <Text className="!text-sm">
          Data from {data.startDate} to {data.endDate}
        </Text>
      </header>

      {data.indicators.map((indicator) => (
        <IndicatorCard key={indicator.id} indicator={indicator} />
      ))}
    </section>
  );
}

type ViewMode = "rows" | "combined";

interface IndicatorCardProps {
  indicator: ChartSectionIndicator;
}

function IndicatorCard({ indicator }: IndicatorCardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("rows");

  const projectsWithData = useMemo(
    () => indicator.projects.filter((p) => p.points.length > 0),
    [indicator.projects]
  );

  return (
    <Card className="report-print-no-break bg-white dark:bg-zinc-800">
      <div className="flex items-start justify-between gap-4">
        <Title className="!text-base">
          {indicator.name}
          {indicator.unit && (
            <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
              ({indicator.unit})
            </span>
          )}
        </Title>
        {projectsWithData.length > 0 && <ViewModeToggle value={viewMode} onChange={setViewMode} />}
      </div>

      {projectsWithData.length === 0 ? (
        <Text className="mt-4 !text-sm text-zinc-500 dark:text-zinc-400">
          No datapoints recorded for the selected projects in this date range.
        </Text>
      ) : viewMode === "rows" ? (
        <RowsView projects={projectsWithData} />
      ) : (
        <CombinedView projects={projectsWithData} />
      )}
    </Card>
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
      className="report-print-hide inline-flex flex-shrink-0 items-center rounded-md border border-zinc-200 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-900"
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
        active
          ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
          : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
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
    <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
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
  const chartData = useMemo(
    () => project.points.map((p) => ({ date: p.date, [project.title]: p.value })),
    [project.points, project.title]
  );

  const latest = latestValue(project);
  const summary = formatValue(latest);

  return (
    <li className={cn("flex items-center gap-4", showAxis ? "pt-2 pb-1" : "py-2")}>
      <div
        className="min-w-0 flex-shrink-0 basis-52 text-sm text-zinc-800 dark:text-zinc-100"
        title={project.title}
      >
        <span className="truncate font-medium">{project.title}</span>
        <span className="ml-2 text-xs font-normal text-zinc-500 dark:text-zinc-300">{summary}</span>
      </div>
      <div className="flex-1">
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
      <Text className="mt-4 !text-sm text-zinc-500 dark:text-zinc-400">
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

  const rows: CombinedRow[] = sortedDates.map((date) => {
    const row: CombinedRow = { date };
    for (const project of projects) {
      const column = columnByUid.get(project.uid)!;
      const value = lookup.get(project.uid)?.get(date);
      // `null` keeps connectNulls bridging missing months.
      row[column] = value ?? null;
    }
    return row;
  });

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
