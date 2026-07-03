"use client";

import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import type { CompositeWeights } from "@/types/donor-research";
import { cn } from "@/utilities/tailwind";
import {
  setWeight,
  WEIGHTS_TOTAL_BASIS_POINTS,
  type WeightDimension,
  weightPercent,
  weightsTotal,
} from "./weights-allocation";

interface WeightDimensionMeta {
  key: WeightDimension;
  label: string;
}

/** R16 / R8 display order, shared by the allocator, methodology, and breakdown. */
const DIMENSIONS: readonly WeightDimensionMeta[] = [
  { key: "onlinePresence", label: "Online presence" },
  { key: "socialPresence", label: "Social presence" },
  { key: "impactRecency", label: "IRS 990 recency" },
  { key: "donorMatch", label: "Mission match" },
  { key: "compliance", label: "Compliance" },
];

interface WeightsAllocatorProps {
  value: CompositeWeights;
  onChange: (next: CompositeWeights) => void;
  /** Weights restored by the Reset button (defaults for create, persisted in the panel). */
  resetValue: CompositeWeights;
  disabled?: boolean;
}

/**
 * Five independent weight sliders with a running total (DEV-418 U6).
 *
 * Each factor has a full-width slider and an editable percentage on the right
 * that set ONLY that factor — nothing is redistributed, so a small ±2% nudge
 * never skids the other four around. The advisor reconciles the total to 100%
 * themselves; the Total pill at the bottom tracks it live (green at 100%, red
 * otherwise) and the commit button stays disabled until it balances. The number
 * input handles the fiddly last-few-percent that a drag can overshoot.
 */
export function WeightsAllocator({
  value,
  onChange,
  resetValue,
  disabled = false,
}: WeightsAllocatorProps) {
  // Local text while a percentage field is focused, so typing "60" isn't
  // snapped back to a single digit by the controlled value mid-keystroke.
  const [editing, setEditing] = useState<{ dim: WeightDimension; text: string } | null>(null);

  const apply = (dim: WeightDimension, requestedPercent: number) => {
    onChange(setWeight(value, dim, requestedPercent));
  };

  const commitInput = (dim: WeightDimension, text: string) => {
    const trimmed = text.trim();
    if (trimmed === "") return; // cleared → keep the current value, don't zero it
    const parsed = Number(trimmed);
    // Ignore non-numeric input and no-op re-entries, so a focus/blur that didn't
    // change anything never re-snaps a weight.
    if (!Number.isFinite(parsed) || Math.round(parsed) === weightPercent(value, dim)) return;
    apply(dim, parsed);
  };

  const reset = () => {
    setEditing(null);
    onChange(resetValue);
  };

  // Mirror the exact basis-point gate in the display: rounding here would let
  // 9,999 bp read as a balanced-looking "100%" while the save gate still
  // rejects it. Whole percents stay integers; anything odd shows its real value.
  const totalBasisPoints = weightsTotal(value);
  const isBalanced = totalBasisPoints === WEIGHTS_TOTAL_BASIS_POINTS;
  const totalPercent = totalBasisPoints / 100;
  const formattedTotal = Number.isInteger(totalPercent)
    ? String(totalPercent)
    : totalPercent.toFixed(2).replace(/\.?0+$/, "");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5">
        {DIMENSIONS.map(({ key, label }) => {
          const labelId = `weight-${key}`;
          const percent = weightPercent(value, key);
          const inputValue = editing && editing.dim === key ? editing.text : String(percent);
          return (
            <div key={key} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span id={labelId} className="text-foreground">
                  {label}
                </span>
                {/* Editable percentage, styled to read like the plain value on
                    the right while staying a real number input (hover/focus
                    reveal it's editable). */}
                <div className="flex items-center text-foreground tabular-nums">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    value={inputValue}
                    disabled={disabled}
                    aria-labelledby={labelId}
                    onFocus={() => setEditing({ dim: key, text: String(percent) })}
                    onChange={(event) => setEditing({ dim: key, text: event.target.value })}
                    onBlur={() => {
                      commitInput(key, inputValue);
                      setEditing(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                    className={cn(
                      "w-12 rounded border-0 bg-muted px-1.5 py-0.5 text-right text-sm tabular-nums text-foreground",
                      "hover:bg-muted focus:bg-muted focus:outline-none focus-visible:outline-none focus-visible:ring-0",
                      "disabled:opacity-60",
                      "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    )}
                  />
                  <span>%</span>
                </div>
              </div>
              <Slider
                aria-labelledby={labelId}
                thumbLabels={[label]}
                value={[percent]}
                min={0}
                max={100}
                step={1}
                disabled={disabled}
                // Uniform light track (no filled range) with a white, blue-ringed thumb.
                rangeClassName="bg-transparent"
                thumbClassName="h-4 w-4 border-2 border-blue-500 bg-white shadow"
                onValueChange={([next]) => {
                  setEditing(null);
                  apply(key, next);
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2.5">
        <span
          aria-live="polite"
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
            isBalanced
              ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400"
              : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
          )}
        >
          Total {formattedTotal}%
        </span>
        <button
          type="button"
          onClick={reset}
          disabled={disabled}
          className="text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
