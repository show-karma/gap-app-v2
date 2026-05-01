"use client";

import { ListChecks, ScrollText, Zap } from "lucide-react";
import React, { useId } from "react";
import { cn } from "@/utilities/tailwind";
import type { EvaluationStyle } from "../schemas/session.schema";

interface StyleOption {
  id: EvaluationStyle;
  title: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const STYLE_OPTIONS: ReadonlyArray<StyleOption> = [
  {
    id: "RUBRIC",
    title: "Rubric",
    description: "Per-criteria scores with strengths, weaknesses, and a recommendation.",
    Icon: ListChecks,
  },
  {
    id: "NARRATIVE",
    title: "Narrative",
    description: "Markdown narrative covering the application across each dimension.",
    Icon: ScrollText,
  },
  {
    id: "QUICK_SCORE",
    title: "Quick Score",
    description: "Pass/fail decision with key factors, red flags, and a one-line summary.",
    Icon: Zap,
  },
];

interface StylePickerProps {
  value: EvaluationStyle;
  onChange: (value: EvaluationStyle) => void;
  disabled?: boolean;
  errorMessage?: string;
}

export const StylePicker = React.memo(function StylePicker({
  value,
  onChange,
  disabled,
  errorMessage,
}: StylePickerProps) {
  const errorId = useId();
  return (
    <div className="space-y-2">
      <fieldset
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        aria-describedby={errorMessage ? errorId : undefined}
      >
        <legend className="sr-only">Evaluation style</legend>
        {STYLE_OPTIONS.map((opt) => {
          const isSelected = opt.id === value;
          return (
            <label
              key={opt.id}
              className={cn(
                "relative flex cursor-pointer flex-col gap-2 rounded-lg border p-4 transition-colors",
                isSelected
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                  : "border-border bg-background hover:border-muted-foreground/40",
                disabled && "cursor-not-allowed opacity-60"
              )}
            >
              <input
                type="radio"
                name="evaluation-style"
                className="sr-only"
                value={opt.id}
                checked={isSelected}
                disabled={disabled}
                onChange={() => onChange(opt.id)}
              />
              <div className="flex items-center gap-2">
                <opt.Icon className="h-5 w-5 text-brand-600" />
                <span className="font-semibold text-foreground">{opt.title}</span>
              </div>
              <p className="text-xs text-muted-foreground">{opt.description}</p>
            </label>
          );
        })}
      </fieldset>
      {errorMessage ? (
        <p id={errorId} className="text-xs text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
});
