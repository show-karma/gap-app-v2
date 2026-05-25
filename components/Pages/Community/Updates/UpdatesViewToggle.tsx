"use client";

import { Squares2X2Icon, TableCellsIcon } from "@heroicons/react/24/outline";
import type { FC } from "react";
import { cn } from "@/utilities/tailwind";

export type UpdatesView = "cards" | "table";

interface UpdatesViewToggleProps {
  value: UpdatesView;
  onChange: (view: UpdatesView) => void;
}

const baseButtonClasses =
  "flex items-center justify-center rounded-md p-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600";
const activeClasses = "bg-white text-gray-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100";
const inactiveClasses =
  "text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200";

export const UpdatesViewToggle: FC<UpdatesViewToggleProps> = ({ value, onChange }) => {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary/50 p-1">
      <span className="sr-only">Toggle updates view</span>
      <button
        type="button"
        aria-label="Card view"
        aria-pressed={value === "cards"}
        onClick={() => onChange("cards")}
        className={cn(baseButtonClasses, value === "cards" ? activeClasses : inactiveClasses)}
      >
        <Squares2X2Icon className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Table view"
        aria-pressed={value === "table"}
        onClick={() => onChange("table")}
        className={cn(baseButtonClasses, value === "table" ? activeClasses : inactiveClasses)}
      >
        <TableCellsIcon className="h-4 w-4" />
      </button>
    </div>
  );
};
