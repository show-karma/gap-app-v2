"use client";

/**
 * DeepResearchPromo — right-rail advertisement shown on the search workbench
 * pointing users to the hand-curated deep research intake page. Opens the
 * deep-research page in a new tab so the active search is preserved.
 */

import { ArrowUpRight, Telescope } from "lucide-react";
import { NON_PROFITS_PAGES } from "@/utilities/pages";

export function DeepResearchPromo() {
  return (
    <aside className="hidden w-72 shrink-0 border-l border-zinc-200 p-4 xl:block dark:border-zinc-800">
      <div className="sticky top-4 overflow-hidden rounded-xl border border-zinc-200 bg-gradient-to-br from-brand-faint via-white to-blue-50 p-4 dark:border-zinc-800 dark:from-brand/10 dark:via-zinc-900 dark:to-blue-900/10">
        <div className="flex size-9 items-center justify-center rounded-lg bg-brand text-white">
          <Telescope className="size-4" />
        </div>
        <p className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Want better results?
        </p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Our AI agents can perform deep research, scour the internet, and find you exactly what you
          need.
        </p>
        <a
          href={NON_PROFITS_PAGES.DEEP_RESEARCH}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
        >
          Try deep research
          <ArrowUpRight className="size-3" />
        </a>
      </div>
    </aside>
  );
}
