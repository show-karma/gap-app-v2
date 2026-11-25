"use client";

import { type FC, type KeyboardEvent, type PointerEvent, useId, useRef, useState } from "react";
import { cn } from "@/utilities/tailwind";
import { formatDate, formatNumber, type SeriesPoint } from "./insightsModel";

const VIEW_WIDTH = 300;
const VIEW_HEIGHT = 80;

interface TrendChartProps {
  points: SeriesPoint[];
  unit?: string | null;
  target?: number | null;
  targetLabel?: string | null;
  label: string;
}

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = [1, 2, 2.5, 5, 10].find((candidate) => normalized <= candidate) ?? 10;
  return step * magnitude;
}

function compact(value: number): string {
  if (Math.abs(value) >= 10_000) {
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(
      value
    );
  }
  return formatNumber(value);
}

/**
 * Area trend chart for one indicator. The plot is a stretched SVG; markers,
 * tick labels and the tooltip are HTML so they keep their shape at any width.
 */
export const Sparkline: FC<TrendChartProps> = ({
  points,
  unit = null,
  target = null,
  targetLabel = null,
  label,
}) => {
  const gradientId = useId();
  const plotRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (points.length < 2) return null;

  const values = points.map((point) => point.value);
  const isFlat = values.every((value) => value === values[0]);
  if (isFlat && target === null) {
    return (
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Unchanged at {formatNumber(values[0])}
        {unit ? ` ${unit}` : ""} since {formatDate(points[0].date, false)}
      </p>
    );
  }

  const domainMax = niceMax(Math.max(...values, target ?? 0));
  const last = points.length - 1;
  const xPct = (i: number) => (i / last) * 100;
  const yPct = (v: number) => 100 - (Math.max(0, v) / domainMax) * 100;
  const toView = (i: number, v: number) =>
    `${((xPct(i) / 100) * VIEW_WIDTH).toFixed(2)},${((yPct(v) / 100) * VIEW_HEIGHT).toFixed(2)}`;
  const linePoints = points.map((point, i) => toView(i, point.value)).join(" ");
  const areaPoints = `0,${VIEW_HEIGHT} ${linePoints} ${VIEW_WIDTH},${VIEW_HEIGHT}`;

  const indexFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = plotRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    return Math.round(ratio * last);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    setActiveIndex((current) => {
      const start = current ?? last;
      return event.key === "ArrowLeft" ? Math.max(0, start - 1) : Math.min(last, start + 1);
    });
  };

  const markerIndex = activeIndex ?? last;
  const marker = points[markerIndex];
  const valueText = `${formatNumber(marker.value)}${unit ? ` ${unit}` : ""}`;
  const tooltipOnLeft = xPct(markerIndex) > 60;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <div className="flex w-9 shrink-0 flex-col justify-between text-right text-xs tabular-nums leading-none text-gray-400 dark:text-gray-500">
          <span>{compact(domainMax)}</span>
          <span>0</span>
        </div>
        <div
          ref={plotRef}
          role="slider"
          aria-label={`${label}. Use the arrow keys to read each day.`}
          aria-valuemin={0}
          aria-valuemax={last}
          aria-valuenow={markerIndex}
          aria-valuetext={`${formatDate(marker.date)}: ${valueText}`}
          tabIndex={0}
          className="relative h-20 min-w-0 flex-1 cursor-crosshair rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 dark:focus-visible:ring-zinc-500 dark:focus-visible:ring-offset-zinc-900"
          onPointerMove={(event) => setActiveIndex(indexFromPointer(event))}
          onPointerLeave={() => setActiveIndex(null)}
          onFocus={() => setActiveIndex((current) => current ?? last)}
          onBlur={() => setActiveIndex(null)}
          onKeyDown={onKeyDown}
        >
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-px bg-gray-100 dark:bg-zinc-800"
          />
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-1/2 h-px bg-gray-100 dark:bg-zinc-800"
          />
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-px bg-gray-200 dark:bg-zinc-700"
          />

          <svg
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full overflow-visible text-brand-emphasis dark:text-brand-500"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.16" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <polygon points={areaPoints} fill={`url(#${gradientId})`} />
            <polyline
              points={linePoints}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {target !== null ? (
            <>
              <span
                aria-hidden="true"
                className="absolute inset-x-0 border-t border-dashed border-gray-400 dark:border-zinc-500"
                style={{ top: `${yPct(target)}%` }}
              />
              <span
                className="absolute right-0 -translate-y-full pb-0.5 text-xs font-medium leading-none text-gray-500 dark:text-gray-400"
                style={{ top: `${yPct(target)}%` }}
              >
                {targetLabel ?? `Target ${formatNumber(target)}`}
              </span>
            </>
          ) : null}

          {activeIndex !== null ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 w-px bg-gray-300 dark:bg-zinc-600"
              style={{ left: `${xPct(activeIndex)}%` }}
            />
          ) : null}

          <span
            aria-hidden="true"
            className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-emphasis ring-2 ring-white dark:bg-brand-500 dark:ring-zinc-900"
            style={{ left: `${xPct(markerIndex)}%`, top: `${yPct(marker.value)}%` }}
          />

          {activeIndex !== null ? (
            <div
              className={cn(
                "pointer-events-none absolute top-0 z-10 flex flex-col gap-0.5 whitespace-nowrap rounded-md border border-gray-200 bg-white px-2.5 py-1.5 shadow-md dark:border-zinc-700 dark:bg-zinc-800",
                tooltipOnLeft ? "-translate-x-full -ml-2" : "ml-2"
              )}
              style={{ left: `${xPct(activeIndex)}%` }}
            >
              <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                {valueText}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatDate(marker.date)}
              </span>
            </div>
          ) : null}
        </div>
      </div>
      <div className="ml-11 flex justify-between text-xs tabular-nums leading-none text-gray-400 dark:text-gray-500">
        <span>{formatDate(points[0].date, false)}</span>
        <span>{formatDate(points[last].date, false)}</span>
      </div>
    </div>
  );
};
