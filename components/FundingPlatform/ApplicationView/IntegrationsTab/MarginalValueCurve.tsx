"use client";

import type { FC } from "react";
import type { SimocracyMvfPoint } from "@/services/fundingApplicationIntegrations.service";

export interface MarginalValueCurveProps {
  points: SimocracyMvfPoint[];
  /** Ratified allocation for this proposal, drawn as a vertical marker. */
  funded?: number | null;
}

function formatValue(marginalValueMilli: number): string {
  return (marginalValueMilli / 1000).toFixed(2);
}

function formatDollars(dollars: number): string {
  return `$${dollars.toLocaleString()}`;
}

const TOP_PAD_PCT = 10;

export const MarginalValueCurve: FC<MarginalValueCurveProps> = ({ points, funded }) => {
  const anchors = [...points].sort((a, b) => a.dollars - b.dollars);
  if (anchors.length < 2) return null;

  const total = anchors[anchors.length - 1].dollars;
  const maxValue = Math.max(...anchors.map((anchor) => anchor.marginalValueMilli));
  if (total <= 0 || maxValue <= 0) return null;

  const xPct = (dollars: number) => (dollars / total) * 100;
  const yPct = (valueMilli: number) => 100 - (valueMilli / maxValue) * (100 - TOP_PAD_PCT);

  const linePoints = anchors
    .map((anchor) => `${xPct(anchor.dollars)},${yPct(anchor.marginalValueMilli)}`)
    .join(" ");
  const areaPoints = `${linePoints} 100,100 0,100`;

  const fundedX = funded != null && funded > 0 ? Math.min(xPct(funded), 100) : null;

  return (
    <div className="select-none">
      <div className="mb-1 flex items-baseline justify-between">
        <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Marginal value</p>
        {fundedX !== null ? (
          <p className="text-[11px] font-medium tabular-nums text-gray-700 dark:text-gray-300">
            funded {formatDollars(funded as number)}
          </p>
        ) : (
          <p className="text-[11px] tabular-nums text-gray-400 dark:text-gray-500">
            {formatValue(maxValue)} max
          </p>
        )}
      </div>

      <div className="relative h-20">
        <svg
          className="absolute inset-0 h-full w-full text-blue-600 dark:text-blue-400"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polygon points={areaPoints} fill="currentColor" fillOpacity="0.12" />
          <polyline
            points={linePoints}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {fundedX !== null && (
          <div
            className="absolute inset-y-0 border-l border-dashed border-gray-400 dark:border-gray-500"
            style={{ left: `${fundedX}%` }}
            title={`Funded ${formatDollars(funded as number)}`}
          />
        )}

        {anchors.map((anchor) => (
          <span
            key={anchor.dollars}
            className="group absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-blue-600 bg-white dark:border-blue-400 dark:bg-zinc-800"
            style={{
              left: `${xPct(anchor.dollars)}%`,
              top: `${yPct(anchor.marginalValueMilli)}%`,
            }}
          >
            <span
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {formatValue(anchor.marginalValueMilli)} at {formatDollars(anchor.dollars)}
            </span>
          </span>
        ))}
      </div>

      <div className="relative mt-1 h-4 text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
        {anchors.map((anchor, index) => (
          <span
            key={anchor.dollars}
            className="absolute"
            style={
              index === 0
                ? { left: 0 }
                : index === anchors.length - 1
                  ? { right: 0 }
                  : { left: `${xPct(anchor.dollars)}%`, transform: "translateX(-50%)" }
            }
          >
            {formatDollars(anchor.dollars)}
          </span>
        ))}
      </div>
    </div>
  );
};
