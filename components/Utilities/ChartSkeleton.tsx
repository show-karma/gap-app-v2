import { Skeleton } from "@/components/Utilities/Skeleton";
import { cn } from "@/utilities/tailwind";

interface ChartSkeletonProps {
  /** Height of the chart skeleton. Defaults to "h-52" to match typical AreaChart height. */
  height?: string;
  /** Width of the chart skeleton. Defaults to "w-full". */
  width?: string;
  /** Whether to show a title placeholder. Defaults to false. */
  showTitle?: boolean;
  /** Whether to show legend placeholders. Defaults to false. */
  showLegend?: boolean;
  /** Number of legend items to show if showLegend is true. Defaults to 3. */
  legendCount?: number;
  /** Additional CSS classes to apply to the container. */
  className?: string;
  /** Test ID for testing purposes. */
  "data-testid"?: string;
}

/**
 * Skeleton loading component for Tremor charts (AreaChart, BarChart, etc.).
 * Provides a visual placeholder while charts are being lazy-loaded.
 *
 * @example
 * // Basic usage as a Suspense fallback
 * <Suspense fallback={<ChartSkeleton />}>
 *   <LazyAreaChart />
 * </Suspense>
 *
 * @example
 * // With title and legend
 * <ChartSkeleton showTitle showLegend legendCount={2} />
 *
 * @example
 * // Custom dimensions
 * <ChartSkeleton height="h-72" width="w-[500px]" />
 */
export function ChartSkeleton({
  height = "h-52",
  width = "w-full",
  showTitle = false,
  showLegend = false,
  legendCount = 3,
  className,
  "data-testid": testId = "chart-skeleton",
}: ChartSkeletonProps) {
  return (
    <div className={cn("flex flex-col gap-4", width, className)} data-testid={testId}>
      {/* Title placeholder */}
      {showTitle && <Skeleton className="h-5 w-40" />}

      {/* Legend placeholders */}
      {showLegend && (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: legendCount }, (_, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Skeleton className="h-3 w-3 rounded-sm" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      )}

      {/* Chart area skeleton */}
      <div className={cn("relative rounded-lg bg-gray-100 dark:bg-zinc-800", height)}>
        {/* Y-axis placeholder */}
        <div className="absolute left-0 top-0 bottom-0 w-10 flex flex-col justify-between py-4">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-6" />
          <Skeleton className="h-3 w-7" />
          <Skeleton className="h-3 w-5" />
          <Skeleton className="h-3 w-8" />
        </div>

        {/* Chart visualization area */}
        <div className="absolute inset-0 ml-12 mr-4 my-4 flex items-end justify-around gap-1">
          {/* Animated bars/area representation */}
          {Array.from({ length: 12 }, (_, i) => {
            // Create varying heights for visual interest
            const heights = [40, 60, 45, 70, 55, 80, 65, 50, 75, 60, 85, 70];
            const heightPercent = heights[i % heights.length];
            return (
              <div
                key={i}
                className="flex-1 bg-gray-200 dark:bg-zinc-700 rounded-t animate-pulse"
                style={{ height: `${heightPercent}%` }}
              />
            );
          })}
        </div>

        {/* X-axis placeholder */}
        <div className="absolute left-12 right-4 bottom-0 h-6 flex justify-between items-center">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-8" />
        </div>
      </div>
    </div>
  );
}

interface DonutChartSkeletonProps {
  /** Height of the donut chart skeleton. Defaults to "h-40". */
  height?: string;
  /** Additional CSS classes to apply to the container. */
  className?: string;
  /** Test ID for testing purposes. */
  "data-testid"?: string;
}

/**
 * Skeleton loading component for Tremor DonutChart.
 * Provides a circular placeholder while the chart is being lazy-loaded.
 *
 * @example
 * // Basic usage
 * <DonutChartSkeleton />
 *
 * @example
 * // Custom height
 * <DonutChartSkeleton height="h-56" />
 */
export function DonutChartSkeleton({
  height = "h-40",
  className,
  "data-testid": testId = "donut-chart-skeleton",
}: DonutChartSkeletonProps) {
  return (
    <div
      className={cn("w-full flex items-center justify-center", height, className)}
      data-testid={testId}
    >
      <div className="relative">
        {/* Outer ring */}
        <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-zinc-700 animate-pulse" />
        {/* Inner hole */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}
