"use client";

import { Card, Text, Title } from "@tremor/react";
import { RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { ChartSkeleton } from "@/components/Utilities/ChartSkeleton";
import { Button } from "@/components/ui/button";
import { useReportCharts } from "@/hooks/portfolio-reports/usePortfolioReports";
import type { ChartSectionIndicator, ChartSectionProject } from "@/types/portfolio-report";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";

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

interface IndicatorBlockProps {
  indicator: ChartSectionIndicator;
}

function IndicatorBlock({ indicator }: IndicatorBlockProps) {
  const projectsWithData = useMemo(
    () => indicator.projects.filter((p) => p.points.length > 0),
    [indicator.projects]
  );
  const [selectedUids, setSelectedUids] = useState<Set<string>>(() => new Set());

  const handleToggle = (uid: string) => {
    setSelectedUids((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const handleClear = () => {
    setSelectedUids(new Set());
  };

  return (
    <article className="report-print-no-break border-t border-zinc-200 pt-8 first:border-t-0 first:pt-0 [&:not(:last-child)]:pb-8">
      <Title className="!text-base !text-zinc-900">
        {indicator.name}
        {indicator.unit && (
          <span className="ml-2 text-sm font-normal text-zinc-500">({indicator.unit})</span>
        )}
      </Title>

      {projectsWithData.length === 0 ? (
        <Text className="mt-4 !text-sm !text-zinc-500">
          No datapoints recorded for the selected projects in this date range.
        </Text>
      ) : (
        <>
          <ProjectFilterPills
            projects={projectsWithData}
            selectedUids={selectedUids}
            onToggle={handleToggle}
            onClear={handleClear}
          />
          <CombinedView projects={projectsWithData} selectedUids={selectedUids} />
        </>
      )}
    </article>
  );
}

interface ProjectFilterPillsProps {
  projects: ChartSectionProject[];
  selectedUids: Set<string>;
  onToggle: (uid: string) => void;
  onClear: () => void;
}

function ProjectFilterPills({
  projects,
  selectedUids,
  onToggle,
  onClear,
}: ProjectFilterPillsProps) {
  const hasFilter = selectedUids.size > 0;
  return (
    <div
      role="toolbar"
      aria-label="Filter chart by project"
      className="mt-4 flex flex-wrap items-center gap-1.5"
    >
      {projects.map((project, i) => {
        const color = SERIES_COLORS[i % SERIES_COLORS.length];
        const isSelected = selectedUids.has(project.uid);
        const isDimmed = hasFilter && !isSelected;
        return (
          <button
            key={project.uid}
            type="button"
            aria-pressed={isSelected}
            title={isSelected ? `Remove ${project.title}` : `Add ${project.title}`}
            onClick={() => onToggle(project.uid)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
              isSelected
                ? "border-zinc-900 bg-zinc-900 text-white"
                : isDimmed
                  ? "border-zinc-200 bg-white text-zinc-400 hover:bg-zinc-50"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
            )}
          >
            <span
              className={cn("h-2 w-2 flex-shrink-0 rounded-full", COLOR_DOT_CLASSES[color])}
              aria-hidden="true"
            />
            <span className="max-w-[180px] truncate">{project.title}</span>
          </button>
        );
      })}
      {hasFilter && (
        <button
          type="button"
          onClick={onClear}
          className="ml-1 text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline"
        >
          Show all
        </button>
      )}
    </div>
  );
}

// ── Combined view ─────────────────────────────────────────────

interface CombinedViewProps {
  projects: ChartSectionProject[];
  selectedUids: Set<string>;
}

interface CombinedRow {
  date: string;
  [projectTitle: string]: string | number | null;
}

function CombinedView({ projects, selectedUids }: CombinedViewProps) {
  const { rows, categories, colors } = useMemo(() => {
    const built = buildCombined(projects);
    if (selectedUids.size === 0) return built;
    const keptIndices: number[] = [];
    projects.forEach((p, i) => {
      if (selectedUids.has(p.uid)) keptIndices.push(i);
    });
    if (keptIndices.length === 0) return built;
    return {
      rows: built.rows,
      categories: keptIndices.map((i) => built.categories[i]),
      colors: keptIndices.map((i) => built.colors[i]),
    };
  }, [projects, selectedUids]);

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
      colors={colors}
      valueFormatter={(v) => formatValue(v)}
      showLegend={false}
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

// Tailwind needs static class names so the JIT compiler emits them; this
// maps each Tremor series color to its matching dot swatch class.
const COLOR_DOT_CLASSES: Record<string, string> = {
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  cyan: "bg-cyan-500",
  indigo: "bg-indigo-500",
  orange: "bg-orange-500",
  pink: "bg-pink-500",
  teal: "bg-teal-500",
  fuchsia: "bg-fuchsia-500",
  lime: "bg-lime-500",
};

// Resolve unique column names per project (handles duplicate titles).
function buildColumnsByUid(projects: ChartSectionProject[]): Map<string, string> {
  const seen = new Map<string, number>();
  const columnByUid = new Map<string, string>();
  for (const project of projects) {
    const base = project.title || project.uid;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    columnByUid.set(project.uid, count === 1 ? base : `${base} (${count})`);
  }
  return columnByUid;
}

// (uid, date) → value lookup.
function buildValueLookup(projects: ChartSectionProject[]): Map<string, Map<string, number>> {
  const lookup = new Map<string, Map<string, number>>();
  for (const project of projects) {
    const inner = new Map<string, number>();
    for (const point of project.points) {
      inner.set(point.date, point.value);
    }
    lookup.set(project.uid, inner);
  }
  return lookup;
}

function buildCombined(projects: ChartSectionProject[]): {
  rows: CombinedRow[];
  categories: string[];
  colors: string[];
} {
  const columnByUid = buildColumnsByUid(projects);
  const lookup = buildValueLookup(projects);

  // Union of dates across all projects.
  const dateSet = new Set<string>();
  for (const project of projects) {
    for (const point of project.points) {
      dateSet.add(point.date);
    }
  }
  const sortedDates = Array.from(dateSet).sort();

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

  // categories/colors are aligned by project order — Map preserves insertion
  // order, and we colored each project by its index above.
  return {
    rows: Array.from(rowsByLabel.values()),
    categories: Array.from(columnByUid.values()),
    colors: projects.map((_, i) => SERIES_COLORS[i % SERIES_COLORS.length]),
  };
}

// ── Helpers ───────────────────────────────────────────────

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
