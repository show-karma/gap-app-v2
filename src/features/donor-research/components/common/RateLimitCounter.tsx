"use client";

import { Sparkles } from "lucide-react";
import type { DonorAdvisor, DonorResearchRateLimitTier } from "@/types/donor-research";

interface RateLimitCounterProps {
  advisor: DonorAdvisor;
  /**
   * Optional today's counters from the indexer when surfaced (e.g., on
   * the report-list page). The MVP backend doesn't return live counters
   * on `/me` yet, so this component renders the tier cap as the upper
   * bound and uses placeholders for the consumed count until that
   * endpoint surfaces them.
   */
  fastUsedToday?: number;
  deepUsedToday?: number;
}

const TIER_CAPS: Record<DonorResearchRateLimitTier, { fast: number | null; deep: number | null }> =
  {
    beta: { fast: 10, deep: 2 },
    standard: { fast: 50, deep: 10 },
    unlimited: { fast: null, deep: null },
  };

/**
 * Persistent header counter (U13d). Shows tier + today's caps so the
 * advisor sees their daily budget at a glance.
 *
 * When the indexer wires per-day counter surfacing on `/me`, replace
 * the `?? "—"` placeholders with the live values.
 */
export function RateLimitCounter({ advisor, fastUsedToday, deepUsedToday }: RateLimitCounterProps) {
  const caps = TIER_CAPS[advisor.rateLimitTier];
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
      <Sparkles className="h-3.5 w-3.5" />
      <span className="font-medium capitalize text-foreground">{advisor.rateLimitTier} tier</span>
      <span aria-hidden>·</span>
      <span>
        Fast: {fastUsedToday ?? "—"}/{caps.fast === null ? "∞" : caps.fast} today
      </span>
      <span aria-hidden>·</span>
      <span>
        Deep: {deepUsedToday ?? "—"}/{caps.deep === null ? "∞" : caps.deep} today
      </span>
    </div>
  );
}
