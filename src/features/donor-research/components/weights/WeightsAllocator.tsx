"use client";

import { Lock, LockOpen } from "lucide-react";
import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import type { CompositeWeights } from "@/types/donor-research";
import { cn } from "@/utilities/tailwind";
import { redistributeWeights, type WeightDimension, weightPercent } from "./weights-allocation";

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
 * Five weight sliders with lock & redistribute (DEV-418 U6).
 *
 * Each factor has a lock toggle, a slider, and an editable percentage. Locking
 * a factor freezes its share; moving an unlocked slider — or typing a new
 * percentage — only redistributes the difference across the other UNLOCKED
 * factors (proportionally), so the five always total 100% and the advisor never
 * has to land the total by hand. The number input handles the fiddly
 * last-few-percent that a drag can overshoot.
 */
export function WeightsAllocator({
  value,
  onChange,
  resetValue,
  disabled = false,
}: WeightsAllocatorProps) {
  const [locked, setLocked] = useState<ReadonlySet<WeightDimension>>(() => new Set());
  // Local text while a percentage field is focused, so typing "60" isn't
  // snapped back to a single digit by the controlled value mid-keystroke.
  const [editing, setEditing] = useState<{ dim: WeightDimension; text: string } | null>(null);

  const apply = (dim: WeightDimension, requestedPercent: number) => {
    onChange(redistributeWeights(value, locked, dim, requestedPercent));
  };

  const toggleLock = (dim: WeightDimension) => {
    setLocked((prev) => {
      const next = new Set(prev);
      if (next.has(dim)) {
        next.delete(dim);
      } else {
        next.add(dim);
      }
      return next;
    });
  };

  const commitInput = (dim: WeightDimension, text: string) => {
    const trimmed = text.trim();
    if (trimmed === "") return; // cleared → keep the current value, don't zero it
    const parsed = Number(trimmed);
    // Ignore non-numeric input and no-op re-entries, so a focus/blur that didn't
    // change anything never redistributes (or snaps a non-whole-percent weight).
    if (!Number.isFinite(parsed) || Math.round(parsed) === weightPercent(value, dim)) return;
    apply(dim, parsed);
  };

  const reset = () => {
    setLocked(new Set());
    setEditing(null);
    onChange(resetValue);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        Lock the weights you're happy with — their % is frozen. Moving an unlocked slider (or typing
        a percentage) only redistributes across the other unlocked criteria, so the total stays
        100%.
      </p>

      <div className="flex flex-col gap-3.5">
        {DIMENSIONS.map(({ key, label }) => {
          const labelId = `weight-${key}`;
          const isLocked = locked.has(key);
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
                    disabled={disabled || isLocked}
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-pressed={isLocked}
                  aria-label={`${isLocked ? "Unlock" : "Lock"} ${label}`}
                  disabled={disabled}
                  onClick={() => toggleLock(key)}
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                    isLocked
                      ? "border-foreground/40 bg-muted text-foreground"
                      : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  )}
                >
                  {isLocked ? (
                    <Lock aria-hidden className="h-3.5 w-3.5" />
                  ) : (
                    <LockOpen aria-hidden className="h-3.5 w-3.5" />
                  )}
                </button>
                <Slider
                  aria-labelledby={labelId}
                  thumbLabels={[label]}
                  value={[percent]}
                  min={0}
                  max={100}
                  step={1}
                  disabled={disabled || isLocked}
                  onValueChange={([next]) => {
                    setEditing(null);
                    apply(key, next);
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
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
