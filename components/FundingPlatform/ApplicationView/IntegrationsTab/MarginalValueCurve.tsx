"use client";

import type { FC } from "react";
import type { SimocracyMvfPoint } from "@/services/fundingApplicationIntegrations.service";

export interface MarginalValueCurveProps {
  points: SimocracyMvfPoint[];
}

interface Segment {
  from: number;
  to: number;
  valueMilli: number;
}

function formatValue(marginalValueMilli: number): string {
  return (marginalValueMilli / 1000).toFixed(2);
}

function formatDollars(dollars: number): string {
  return `$${dollars.toLocaleString()}`;
}

// The mvf is piecewise-constant: each anchor's value holds until the next one.
function toSegments(points: SimocracyMvfPoint[]): Segment[] {
  const sorted = [...points].sort((a, b) => a.dollars - b.dollars);
  const segments: Segment[] = [];
  for (let i = 0; i < sorted.length - 1; i += 1) {
    if (sorted[i].marginalValueMilli <= 0) continue;
    segments.push({
      from: sorted[i].dollars,
      to: sorted[i + 1].dollars,
      valueMilli: sorted[i].marginalValueMilli,
    });
  }
  return segments;
}

export const MarginalValueCurve: FC<MarginalValueCurveProps> = ({ points }) => {
  const segments = toSegments(points);
  if (segments.length === 0) return null;

  const total = segments[segments.length - 1].to;
  const maxValue = Math.max(...segments.map((segment) => segment.valueMilli));
  const boundaries = [segments[0].from, ...segments.map((segment) => segment.to)];

  return (
    <div className="select-none">
      <p className="mb-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
        Marginal value
      </p>
      <div
        className="flex h-2.5 w-full gap-px overflow-hidden rounded-full"
        title="The sim's marginal value at each funding level — darker is higher"
      >
        {segments.map((segment) => (
          <div
            key={`${segment.from}-${segment.to}`}
            className="group relative h-full bg-blue-600 dark:bg-blue-400"
            style={{
              width: `${((segment.to - segment.from) / total) * 100}%`,
              opacity: 0.25 + 0.75 * (segment.valueMilli / maxValue),
            }}
          >
            <span
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {formatValue(segment.valueMilli)} at {formatDollars(segment.from)}–
              {formatDollars(segment.to)}
            </span>
          </div>
        ))}
      </div>
      <div className="relative mt-1 h-4 text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
        {boundaries.map((dollars, index) => (
          <span
            key={dollars}
            className="absolute"
            style={
              index === 0
                ? { left: 0 }
                : index === boundaries.length - 1
                  ? { right: 0 }
                  : { left: `${(dollars / total) * 100}%`, transform: "translateX(-50%)" }
            }
          >
            {formatDollars(dollars)}
          </span>
        ))}
      </div>
    </div>
  );
};
