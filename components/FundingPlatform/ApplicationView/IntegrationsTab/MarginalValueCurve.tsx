"use client";

import type { FC } from "react";
import type { SimocracyMvfPoint } from "@/services/fundingApplicationIntegrations.service";

export interface MarginalValueCurveProps {
  points: SimocracyMvfPoint[];
}

function formatValue(marginalValueMilli: number): string {
  return (marginalValueMilli / 1000).toFixed(2);
}

export const MarginalValueCurve: FC<MarginalValueCurveProps> = ({ points }) => {
  const maxMilli = Math.max(...points.map((point) => point.marginalValueMilli), 0);

  return (
    <ul className="space-y-1.5">
      {points.map((point) => {
        const widthPercent = maxMilli > 0 ? (point.marginalValueMilli / maxMilli) * 100 : 0;
        return (
          <li
            key={`${point.dollars}-${point.marginalValueMilli}`}
            className="flex items-center gap-3"
          >
            <span className="w-40 flex-shrink-0 text-xs text-gray-600 dark:text-gray-400 tabular-nums">
              at ${point.dollars.toLocaleString()} → value {formatValue(point.marginalValueMilli)}
            </span>
            <span className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-zinc-700 overflow-hidden">
              <span
                className="block h-full rounded-full bg-primary/70"
                style={{ width: `${widthPercent}%` }}
              />
            </span>
          </li>
        );
      })}
    </ul>
  );
};
