"use client";

import { Sparkles } from "lucide-react";
import { useDonorCounters } from "@/hooks/useDonorAdvisor";
import type { DonorAdvisor, DonorResearchRateLimitTier } from "@/types/donor-research";

interface RateLimitCounterProps {
  advisor: DonorAdvisor;
}

const FALLBACK_TIER_CAPS: Record<
  DonorResearchRateLimitTier,
  { fast: number | null; deep: number | null }
> = {
  beta: { fast: 10, deep: 2 },
  standard: { fast: 50, deep: 10 },
  unlimited: { fast: null, deep: null },
};

/**
 * Persistent header counter (U13d / F1 follow-up).
 *
 * Pulls today's consumed counts from `GET /v2/donor-research/me/counters`
 * via `useDonorCounters` (auto-refetches every 60s). Falls back to the
 * advisor's tier defaults when the counters endpoint is still loading or
 * the backend reported `degraded` (Redis unreachable).
 */
export function RateLimitCounter({ advisor }: RateLimitCounterProps) {
  const countersQuery = useDonorCounters(true);
  const fallbackCaps = FALLBACK_TIER_CAPS[advisor.rateLimitTier];

  const snapshot = countersQuery.data;
  // Loading and degraded states both fall through to "—" so the chip
  // never claims a fabricated consumed count.
  const showLive = !!snapshot && !snapshot.degraded;

  const fastUsed = showLive ? snapshot.fast.used : null;
  const deepUsed = showLive ? snapshot.deep.used : null;
  const fastCap = snapshot ? snapshot.fast.cap : fallbackCaps.fast;
  const deepCap = snapshot ? snapshot.deep.cap : fallbackCaps.deep;

  return (
    <div
      className="flex items-stretch overflow-hidden rounded-md border border-border bg-background text-xs"
      title={
        snapshot?.degraded ? "Counter service unavailable; showing tier caps only." : undefined
      }
    >
      <div className="flex items-center gap-1.5 border-r border-border/60 px-2.5 py-1.5">
        <Sparkles className="h-3 w-3 text-brand-emphasis dark:text-brand-subtle" aria-hidden />
        <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          {advisor.rateLimitTier}
        </span>
      </div>
      <div className="flex items-baseline gap-1 border-r border-border/60 px-2.5 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          Fast
        </span>
        <span className="font-mono tabular-nums text-foreground">{fastUsed ?? "—"}</span>
        <span className="text-[10px] text-muted-foreground">
          / {fastCap === null ? "∞" : fastCap}
        </span>
      </div>
      <div className="flex items-baseline gap-1 px-2.5 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          Deep
        </span>
        <span className="font-mono tabular-nums text-foreground">{deepUsed ?? "—"}</span>
        <span className="text-[10px] text-muted-foreground">
          / {deepCap === null ? "∞" : deepCap}
        </span>
      </div>
      {snapshot?.degraded ? (
        <div className="flex items-center border-l border-amber-300/60 bg-amber-50 px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-amber-700 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300">
          usage offline
        </div>
      ) : null}
    </div>
  );
}
