"use client";

import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { cn } from "@/utilities/tailwind";

interface KarmaProfileContextSectionProps {
  context: string;
  /**
   * Override the section's collapsible label. Defaults to copy that fits
   * the legacy Internal-eval audit-trail use case. The new Insights tab
   * passes its own copy.
   */
  title?: string;
  /**
   * Override the section's hint line. Defaults to the legacy audit-trail
   * copy.
   */
  hint?: string;
}

/**
 * Collapsible block that surfaces the raw Karma profile markdown the
 * aggregator built. Used as an audit trail so reviewers can verify any
 * AI claim against the underlying ground-truth data.
 *
 * Two consumers:
 * - Legacy `InternalAIEvaluation.tsx` (for historical records that still
 *   have `internalAIEvaluation.context`).
 * - New `KarmaProfileEvaluation` tab (the canonical home for fresh context
 *   blocks).
 */
export function KarmaProfileContextSection({
  context,
  title = "Karma profile context used",
  hint = "Verify any track-record claim the AI made against this raw block",
}: KarmaProfileContextSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen((open) => !open);

  return (
    <div className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between px-3 py-2 text-left text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
      >
        <span className="flex flex-col gap-0.5">
          <span>{title}</span>
          <span className="text-xs font-normal text-gray-500 dark:text-gray-400">{hint}</span>
        </span>
        <ChevronDownIcon
          className={cn("w-4 h-4 transition-transform", isOpen ? "rotate-180" : "")}
        />
      </button>
      {isOpen ? (
        <div className="px-3 pb-3 pt-1 border-t border-zinc-200 dark:border-zinc-700">
          <MarkdownPreview source={context} className="text-xs" />
        </div>
      ) : null}
    </div>
  );
}
