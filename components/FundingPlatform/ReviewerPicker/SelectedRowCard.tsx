"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { memo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/utilities/tailwind";
import {
  isRowDirty,
  type ReviewerRoleSelection,
  type SelectedRow,
} from "./ReviewerPickerModal.types";

interface SelectedRowCardProps {
  row: SelectedRow;
  onFieldChange: (
    id: string,
    field: "name" | "email" | "telegram" | "slack",
    value: string
  ) => void;
  onToggleRole: (id: string, role: ReviewerRoleSelection) => void;
  onRemove: (id: string) => void;
}

export const SelectedRowCard = memo(function SelectedRowCard({
  row,
  onFieldChange,
  onToggleRole,
  onRemove,
}: SelectedRowCardProps) {
  const isPool = row.kind === "pool";
  const hasError = !!row.error;
  const dirty = isPool && isRowDirty(row);

  return (
    <div
      className={cn(
        "rounded-lg border bg-white dark:bg-gray-900/60 p-3",
        hasError ? "border-red-300 dark:border-red-700" : "border-gray-200 dark:border-gray-700"
      )}
      data-testid={`selected-row-${row.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {isPool ? (
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {row.name || row.email}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{row.email}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={row.name}
                onChange={(e) => onFieldChange(row.id, "name", e.target.value)}
                placeholder="Name *"
                className="h-9 text-sm"
                aria-label="Reviewer name"
              />
              <Input
                value={row.email}
                onChange={(e) => onFieldChange(row.id, "email", e.target.value)}
                placeholder="Email *"
                className="h-9 text-sm"
                aria-label="Reviewer email"
              />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => onRemove(row.id)}
          className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          aria-label="Remove reviewer"
          data-testid={`remove-row-${row.id}`}
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <Input
          value={row.telegram}
          onChange={(e) => onFieldChange(row.id, "telegram", e.target.value)}
          placeholder="Telegram (optional)"
          className="h-8 text-xs"
          aria-label="Telegram"
        />
        <Input
          value={row.slack}
          onChange={(e) => onFieldChange(row.id, "slack", e.target.value)}
          placeholder="Slack (optional)"
          className="h-8 text-xs"
          aria-label="Slack"
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <label
            htmlFor={`role-program-${row.id}`}
            className="inline-flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            <Checkbox
              id={`role-program-${row.id}`}
              checked={row.roles.includes("program")}
              onCheckedChange={() => onToggleRole(row.id, "program")}
              aria-label="App reviewer role"
            />
            App reviewer
          </label>
          <label
            htmlFor={`role-milestone-${row.id}`}
            className="inline-flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            <Checkbox
              id={`role-milestone-${row.id}`}
              checked={row.roles.includes("milestone")}
              onCheckedChange={() => onToggleRole(row.id, "milestone")}
              aria-label="Milestone reviewer role"
            />
            Milestone reviewer
          </label>
        </div>
        {dirty && (
          <span className="text-[10px] text-amber-700 dark:text-amber-400">
            Contact edits apply across all programs.
          </span>
        )}
      </div>

      {hasError && (
        <p
          className="mt-2 text-xs text-red-600 dark:text-red-400"
          data-testid={`row-error-${row.id}`}
        >
          {row.error}
        </p>
      )}
    </div>
  );
});
