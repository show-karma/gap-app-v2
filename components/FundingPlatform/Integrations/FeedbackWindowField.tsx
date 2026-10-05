"use client";

import pluralize from "pluralize";
import type { FC } from "react";
import { Input } from "@/components/ui/input";

export const DEFAULT_FEEDBACK_WINDOW_HOURS = 48;
export const MAX_FEEDBACK_WINDOW_HOURS = 24 * 30;

interface FeedbackWindowFieldProps {
  programId: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  /** Called on blur or Enter with the parsed hours, or null when the input is not a valid window. */
  onCommit: (hours: number | null) => void;
}

// How long reviewers have with a Sim milestone verdict before it is approved.
// Informational: it is quoted in the reviewer notice, nothing publishes on its own.
export const FeedbackWindowField: FC<FeedbackWindowFieldProps> = ({
  programId,
  value,
  disabled,
  onChange,
  onCommit,
}) => {
  const inputId = `simocracy-feedback-window-${programId}`;
  const hours = Number.parseInt(value, 10) || 0;
  const commit = () => {
    const valid = Number.isInteger(hours) && hours >= 1 && hours <= MAX_FEEDBACK_WINDOW_HOURS;
    onCommit(valid ? hours : null);
  };
  return (
    <div className="mt-4 border-t border-gray-100 pt-3.5 dark:border-gray-700">
      <label
        htmlFor={inputId}
        className="block text-xs font-medium text-gray-700 dark:text-gray-300"
      >
        Feedback window
      </label>
      <p className="mt-0.5 max-w-[56ch] text-xs text-gray-500 dark:text-gray-400">
        How long reviewers have to leave feedback on a Sim milestone verdict before it is approved.
        Shown in the reviewer notice; nothing publishes automatically.
      </p>
      <div className="mt-1.5 flex items-center gap-2">
        <Input
          id={inputId}
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_FEEDBACK_WINDOW_HOURS}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          disabled={disabled}
          className="h-8 w-24 text-sm"
          aria-describedby={`${inputId}-unit`}
        />
        <span id={`${inputId}-unit`} className="text-xs text-gray-500 dark:text-gray-400">
          {pluralize("hour", hours)}
        </span>
      </div>
    </div>
  );
};
