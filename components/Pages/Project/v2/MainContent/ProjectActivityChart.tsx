"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChartSkeleton } from "@/components/Utilities/ChartSkeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdatesTabData } from "@/hooks/v2/useUpdatesTabData";
import { DataCard as Card } from "@/src/components/ui/data-card";
import { cn } from "@/utilities/tailwind";

// Dynamically import heavy Tremor chart component for bundle optimization
const AreaChart = dynamic(() => import("@tremor/react").then((mod) => mod.AreaChart), {
  ssr: false,
  loading: () => <ChartSkeleton height="h-[200px]" />,
});

interface ProjectActivityChartProps {
  className?: string;
  /**
   * The project identifier (slug or UID) used for data fetching.
   * Passed from the parent to ensure React Query cache sharing with
   * the server prefetch and other hooks using the same projectId.
   */
  projectId: string;
  /**
   * When true, renders without the Card wrapper for embedding in other components
   * like ProjectHeader. The parent component provides the card styling.
   */
  embedded?: boolean;
}

interface ActivityDataPoint {
  period: string;
  Funding: number;
  "Product updates": number;
  sortKey: number;
}

type TimeRange = "1w" | "1m" | "1y" | "all";

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "1w", label: "1 week" },
  { value: "1m", label: "1 month" },
  { value: "1y", label: "1 year" },
  { value: "all", label: "All time" },
];

/**
 * ProjectActivityChart displays a timeline chart showing when the project
 * was most active based on milestones and updates.
 *
 * Features:
 * - Multi-line chart showing Funding and Product updates activity
 * - Filter checkboxes to toggle visibility of each line
 * - Time range dropdown (1 week, 1 month, 1 year, All time)
 *
 * Props:
 * - embedded: When true, removes Card wrapper for use inside other components
 */
export function ProjectActivityChart({
  className,
  projectId,
  embedded = false,
}: ProjectActivityChartProps) {
  // Track visibility to prevent chart rendering when container is hidden (e.g., lg:hidden on mobile header)
  // This prevents Recharts warnings about width(0) and height(0) when chart is in a hidden container
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Defer Updates/Impacts/Grants queries until the chart is actually visible.
  const { allUpdates: milestones, isLoading } = useUpdatesTabData(projectId, {
    enabled: isVisible,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use Intersection Observer to detect when container becomes visible
    const observer = new IntersectionObserver(
      (entries) => {
        // Only set visible if element is actually intersecting and has dimensions
        const entry = entries[0];
        if (entry.isIntersecting && entry.boundingClientRect.width > 0) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Filter states
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(["Funding", "Product updates"])
  );
  const [timeRange, setTimeRange] = useState<TimeRange>("all");

  // Get time filter cutoff date
  const getTimeFilterDate = (range: TimeRange): Date | null => {
    const now = new Date();
    switch (range) {
      case "1w":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case "1m":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case "1y":
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      case "all":
      default:
        return null;
    }
  };

  // Categorize milestone by type
  const getMilestoneCategory = (type: string): "Funding" | "Product updates" => {
    if (type === "grant" || type === "grant_update" || type === "grant_received") {
      return "Funding";
    }
    return "Product updates";
  };

  // Filter milestones by time range
  const filteredMilestones = useMemo(() => {
    if (!milestones?.length) return [];

    const cutoffDate = getTimeFilterDate(timeRange);
    if (!cutoffDate) return milestones;

    return milestones.filter((m) => new Date(m.createdAt) >= cutoffDate);
  }, [milestones, timeRange]);

  // Get period key and sort key based on time range granularity
  const getPeriodKey = (date: Date, range: TimeRange): { periodKey: string; sortKey: number } => {
    if (range === "1w" || range === "1m") {
      // Daily granularity for 1 week and 1 month
      const sortKey = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
      const periodKey = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      return { periodKey, sortKey };
    }
    // Weekly granularity for 1 year and all time
    // Get the week start date (Sunday) and end date (Saturday)
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const sortKey =
      weekStart.getFullYear() * 10000 + (weekStart.getMonth() + 1) * 100 + weekStart.getDate();

    // Format as "Jan 1-7" or "Dec 29-Jan 4" if spanning months
    const startMonth = weekStart.toLocaleDateString("en-US", { month: "short" });
    const endMonth = weekEnd.toLocaleDateString("en-US", { month: "short" });
    const startDay = weekStart.getDate();
    const endDay = weekEnd.getDate();

    const periodKey =
      startMonth === endMonth
        ? `${startMonth} ${startDay}-${endDay}`
        : `${startMonth} ${startDay}-${endMonth} ${endDay}`;

    return { periodKey, sortKey };
  };

  // Aggregate milestones/updates with granularity based on time range
  const chartData = useMemo(() => {
    if (!filteredMilestones?.length) return [];

    const periodData = new Map<string, { Funding: number; "Product updates": number }>();
    const sortKeys = new Map<string, number>();

    for (const milestone of filteredMilestones) {
      const date = new Date(milestone.createdAt);
      const { periodKey, sortKey } = getPeriodKey(date, timeRange);

      sortKeys.set(periodKey, sortKey);

      const existing = periodData.get(periodKey) || { Funding: 0, "Product updates": 0 };
      const category = getMilestoneCategory(milestone.type);
      existing[category]++;
      periodData.set(periodKey, existing);
    }

    const result: ActivityDataPoint[] = [];
    for (const [period, counts] of periodData.entries()) {
      result.push({
        period,
        Funding: counts.Funding,
        "Product updates": counts["Product updates"],
        sortKey: sortKeys.get(period) || 0,
      });
    }

    return result.sort((a, b) => a.sortKey - b.sortKey);
  }, [filteredMilestones, timeRange]);

  // Calculate summary stats
  const stats = useMemo(() => {
    if (!filteredMilestones?.length) return { total: 0, completed: 0 };

    const total = filteredMilestones.length;
    const completed = filteredMilestones.filter((m) => m.completed).length;

    return { total, completed };
  }, [filteredMilestones]);

  // Toggle category filter
  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        // Don't allow removing all categories
        if (newSet.size > 1) {
          newSet.delete(category);
        }
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Get active categories for the chart
  const activeCategories = Array.from(selectedCategories);

  if (isLoading || !isVisible) {
    const loadingContent = (
      <div className="animate-pulse" style={{ minHeight: embedded ? 186 : 300 }}>
        <div className="h-6 w-48 bg-gray-200 dark:bg-zinc-700 rounded mb-4" />
        <div
          className="bg-gray-100 dark:bg-zinc-700 rounded"
          style={{ height: embedded ? 120 : 200 }}
        />
      </div>
    );

    if (embedded) {
      return (
        <div ref={containerRef} className={cn("", className)}>
          {loadingContent}
        </div>
      );
    }

    return (
      <div ref={containerRef} className={cn("", className)}>
        <Card className="bg-white dark:bg-zinc-800 rounded-xl">{loadingContent}</Card>
      </div>
    );
  }

  const chartContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Project Activity</h3>
      </div>

      {/* Chart - explicit dimensions prevent Recharts 0-dimension warning */}
      <div
        className="min-w-0 w-full"
        style={{ height: embedded ? 120 : 200, minHeight: embedded ? 120 : 200 }}
      >
        {chartData.length > 0 ? (
          <AreaChart
            className="h-full w-full"
            data={chartData}
            index="period"
            categories={activeCategories}
            colors={["blue", "emerald"]}
            showLegend={false}
            showGridLines={true}
            showYAxis={false}
            curveType="monotone"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-gray-500 dark:text-zinc-400">
            No activity data for this period
          </div>
        )}
      </div>

      {/* Filters Row */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-zinc-700">
        {/* Category Checkboxes - Left */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="funding-filter"
              checked={selectedCategories.has("Funding")}
              onCheckedChange={() => toggleCategory("Funding")}
            />
            <Label
              htmlFor="funding-filter"
              className="text-sm text-gray-700 dark:text-zinc-300 cursor-pointer"
            >
              Funding
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="updates-filter"
              checked={selectedCategories.has("Product updates")}
              onCheckedChange={() => toggleCategory("Product updates")}
            />
            <Label
              htmlFor="updates-filter"
              className="text-sm text-gray-700 dark:text-zinc-300 cursor-pointer"
            >
              Product updates
            </Label>
          </div>
        </div>

        {/* Time Range Dropdown - Right */}
        <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
          <SelectTrigger className="w-[120px] h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_RANGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  if (embedded) {
    return <div className={cn("", className)}>{chartContent}</div>;
  }

  return (
    <div className={cn("", className)}>
      <Card className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700">
        {chartContent}
      </Card>
    </div>
  );
}
