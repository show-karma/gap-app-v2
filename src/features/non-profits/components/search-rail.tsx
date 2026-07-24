"use client";

/**
 * SearchRail — the right rail on the search workbench.
 *
 * The connector CTA sits at the top: /find-funders sees steady search usage but
 * very few Claude/ChatGPT connections, and the CTA previously lived inline in
 * the conversation, below the answer and its entity list — i.e. only after a
 * long scroll, and dismissable in one click. In the rail it stays in view for
 * the whole session without pushing the conversation around.
 *
 * The rail is `xl`-only; below that the workbench falls back to the inline
 * ConnectorNudge banner so the CTA is never lost on narrow screens.
 */

import { ConnectorNudge } from "./connector-nudge";
import { DeepResearchPromoCard } from "./deep-research-promo";

export function SearchRail() {
  return (
    <aside
      aria-label="Get more from the agent"
      className="hidden w-72 shrink-0 border-l border-zinc-200 p-4 xl:block dark:border-zinc-800"
    >
      <div className="sticky top-4 flex flex-col gap-4">
        <ConnectorNudge variant="rail" />
        <DeepResearchPromoCard />
      </div>
    </aside>
  );
}
