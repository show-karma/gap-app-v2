"use client";

import { InfoTooltip } from "@/components/Utilities/InfoTooltip";

/**
 * Small "AI" badge shown on a persona chip whose value was extracted by the
 * refine LLM (and not since edited by the advisor). Carries a tooltip
 * explaining the provenance and inviting review.
 */
export function AiBadge() {
  return (
    <InfoTooltip
      content="Extracted by AI — review and edit if needed"
      triggerAsChild
      contentClassName="max-w-[14rem]"
    >
      <span
        className="inline-flex items-center rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-foreground"
        // The tooltip provides the descriptive text; expose it to AT too.
        role="img"
        aria-label="Extracted by AI"
      >
        AI
      </span>
    </InfoTooltip>
  );
}
