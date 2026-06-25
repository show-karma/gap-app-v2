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
 * Each factor has a slider and an editable percentage that set ONLY that
 * factor — nothing is redistributed, so a small ±2% nudge never skids the other
 * four around. The advisor reconciles the total to 100% themselves; the Total
 * row at the bottom tracks it live and the commit button stays disabled until
 * it lands on 100%. The number input handles the fiddly last-few-percent that a
 * drag can overshoot.
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

  const totalPercent = Math.round(weightsTotal(value) / 100);
  const isBalanced = weightsTotal(value) === WEIGHTS_TOTAL_BASIS_POINTS;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        Set how much each criterion counts toward the composite. Drag a slider or type an exact
        percentage on the right — the five must add up to 100% before you can apply them.
      </p>

      <div className="flex flex-col gap-3.5">
        {DIMENSIONS.map(({ key, label }) => {
          const labelId = `weight-${key}`;
          const percent = weightPercent(value, key);
          const inputValue = editing && editing.dim === key ? editing.text : String(percent);
          return (
            <div key={key} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span id={labelId} className="text-foreground/85">
                  {label}
                </span>
                <div className="flex items-center gap-1">
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
                    className="w-14 rounded-md border border-border bg-background px-2 py-1 text-right text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
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
                onValueChange={([next]) => {
                  setEditing(null);
                  apply(key, next);
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-foreground">Total</span>
          <output
            aria-live="polite"
            className={cn(
              "text-sm font-semibold tabular-nums",
              isBalanced ? "text-foreground" : "text-red-600 dark:text-red-400"
            )}
          >
            {totalPercent}%
          </output>
          {!isBalanced ? (
            <span className="text-xs text-muted-foreground">must add up to 100%</span>
          ) : null}
        </div>
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
