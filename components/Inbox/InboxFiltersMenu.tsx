"use client";

import { AdjustmentsHorizontalIcon } from "@heroicons/react/20/solid";
import React, { type FC, type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/utilities/tailwind";

interface InboxFiltersMenuProps {
  /** How many of the filters inside are narrowing the queue right now. */
  activeCount: number;
  /** Labelled rows, each holding one filter control. */
  rows: { label: string; control: ReactNode }[];
  /** Clears every filter the menu holds. */
  onClear?: () => void;
}

/**
 * The secondary filters behind one button, so the filter row reads as the
 * view chips plus two controls rather than six. The count on the button says
 * that something inside is narrowing the list even while it is closed.
 */
const InboxFiltersMenuComponent: FC<InboxFiltersMenuProps> = ({ activeCount, rows, onClear }) => {
  const [open, setOpen] = useState(false);
  const active = activeCount > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={active ? "secondary" : "outline"}
          size="chip"
          aria-label={active ? `Filters, ${activeCount} active` : "Filters"}
          className={cn(
            "font-medium focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
            active && "border border-primary-500 text-primary-700 dark:text-primary-300"
          )}
        >
          <AdjustmentsHorizontalIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          Filters
          {active && <span className="tabular-nums text-xs">{activeCount}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 max-w-[calc(100vw-2rem)] p-3">
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <div key={row.label} className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {row.label}
              </span>
              <div className="flex min-w-0 [&>*]:w-full [&>*]:max-w-none">{row.control}</div>
            </div>
          ))}
          {active && onClear && (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto self-start p-0 text-primary-700 dark:text-primary-300"
              onClick={() => {
                onClear();
                setOpen(false);
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const InboxFiltersMenu = React.memo(InboxFiltersMenuComponent);
InboxFiltersMenu.displayName = "InboxFiltersMenu";
