"use client";

import { useId } from "react";
import { Slider } from "@/components/ui/slider";
import type { CompositeWeights } from "@/types/donor-research";
import { basisPointsToPercent } from "../report-brief/scoring";
import {
  rebalanceWeights,
  WEIGHTS_TOTAL_BASIS_POINTS,
  type WeightDimension,
} from "./use-weights-rebalance";

interface WeightDimensionMeta {
  key: WeightDimension;
  label: string;
}

/** R16 / R8 display order, shared by the sliders, methodology, and breakdown. */
const DIMENSIONS: readonly WeightDimensionMeta[] = [
  { key: "onlinePresence", label: "Online presence" },
  { key: "socialPresence", label: "Social presence" },
  { key: "impactRecency", label: "IRS 990 recency" },
  { key: "donorMatch", label: "Mission match" },
  { key: "compliance", label: "Compliance" },
];

interface WeightsSlidersProps {
  value: CompositeWeights;
  onChange: (next: CompositeWeights) => void;
  disabled?: boolean;
}

/**
 * Five controlled sliders that always sum to 100% (DEV-418 U6). Dragging any
 * one redistributes the other four proportionally via {@link rebalanceWeights}.
 *
 * Each dimension renders an INDEPENDENT single-thumb slider (not one Radix
 * multi-thumb track — those model ordered breakpoints whose thumbs can't
 * cross, the wrong model for proportional redistribution). The parent owns
 * the value, so this component works identically pre-filled with the shipped
 * defaults (create form) or with a report's persisted weights (post-report
 * panel). A polite live region announces the rebalanced values so keyboard
 * and screen-reader users learn that the siblings shifted in response.
 */
export function WeightsSliders({ value, onChange, disabled = false }: WeightsSlidersProps) {
  const labelPrefix = useId();

  const handleChange = (dimension: WeightDimension, nextBasisPoints: number) => {
    onChange(rebalanceWeights(value, dimension, nextBasisPoints));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3.5">
        {DIMENSIONS.map(({ key, label }) => {
          const percent = basisPointsToPercent(value[key]);
          const labelId = `${labelPrefix}-${key}`;
          return (
            <div key={key} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span id={labelId} className="text-foreground/85">
                  {label}
                </span>
                <span className="tabular-nums font-medium text-foreground">{percent}%</span>
              </div>
              <Slider
                aria-labelledby={labelId}
                thumbLabels={[label]}
                value={[value[key]]}
                min={0}
                max={WEIGHTS_TOTAL_BASIS_POINTS}
                step={100}
                disabled={disabled}
                onValueChange={([next]) => handleChange(key, next)}
              />
            </div>
          );
        })}
      </div>

      <output aria-live="polite" className="sr-only">
        {DIMENSIONS.map(({ key, label }) => `${label} ${basisPointsToPercent(value[key])}`).join(
          ", "
        )}
        .
      </output>
    </div>
  );
}
