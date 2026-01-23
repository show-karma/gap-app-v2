"use client";

import { AreaChart, Card } from "@tremor/react";
import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjectUpdates } from "@/hooks/v2/useProjectUpdates";
import { useProjectStore } from "@/store";
import { cn } from "@/utilities/tailwind";

interface ProjectActivityChartProps {
  className?: string;
  /**
   * When true, renders without the Card wrapper for embedding in other components
   * like ProjectHeader. The parent component provides the card styling.
   */
  embedded?: boolean;
}

interface MonthlyActivity {
  month: string;
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
export function ProjectActivityChart({ className, embedded = false }: ProjectActivityChartProps) {
  const { project } = useProjectStore();
  const { milestones, isLoading } = useProjectUpdates(project?.uid || "");

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
    if (type === "grant" || type === "grant_update") {
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

  // Aggregate milestones/updates by month with separate categories
  const chartData = useMemo(() => {
    if (!filteredMilestones?.length) return [];

    const monthlyData = new Map<string, { Funding: number; "Product updates": number }>();
    const sortKeys = new Map<string, number>();

    for (const milestone of filteredMilestones) {
      const date = new Date(milestone.createdAt);
      const sortKey = date.getFullYear() * 100 + date.getMonth();
      const monthKey = date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });

      sortKeys.set(monthKey, sortKey);

      const existing = monthlyData.get(monthKey) || { Funding: 0, "Product updates": 0 };
      const category = getMilestoneCategory(milestone.type);
      existing[category]++;
      monthlyData.set(monthKey, existing);
    }

    const result: MonthlyActivity[] = [];
    for (const [month, counts] of monthlyData.entries()) {
      result.push({
        month,
        Funding: counts.Funding,
        "Product updates": counts["Product updates"],
        sortKey: sortKeys.get(month) || 0,
      });
    }

    return result.sort((a, b) => a.sortKey - b.sortKey);
  }, [filteredMilestones]);

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

  if (isLoading) {
    const loadingContent = (
      <div className="animate-pulse">
        <div className="h-6 w-48 bg-gray-200 dark:bg-zinc-700 rounded mb-4" />
        <div className="h-[180px] bg-gray-100 dark:bg-zinc-700 rounded" />
      </div>
    );

    if (embedded) {
      return <div className={cn("", className)}>{loadingContent}</div>;
    }

    return (
      <div className={cn("", className)}>
        <Card className="bg-white dark:bg-zinc-800 rounded-xl">{loadingContent}</Card>
      </div>
    );
  }

  if (!chartData.length) {
    if (embedded) {
      return (
        <div
          className={cn("flex flex-col items-center justify-center h-full text-center", className)}
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100 mb-2">
            Project Activity
          </h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">No activity data yet</p>
        </div>
      );
    }
    return null;
  }

  const chartContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Project Activity</h3>
        <div className="text-sm text-gray-500 dark:text-zinc-400">
          {stats.total} Milestones, {stats.completed} Completed
        </div>
      </div>

      {/* Chart */}
      <AreaChart
        className={embedded ? "h-[120px]" : "h-[200px]"}
        data={chartData}
        index="month"
        categories={activeCategories}
        colors={["blue", "emerald"]}
        showLegend={false}
        showGridLines={true}
        showYAxis={false}
        curveType="monotone"
      />

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
