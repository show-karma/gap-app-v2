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
    <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
      <Sparkles className="h-3.5 w-3.5" />
      <span className="font-medium capitalize text-foreground">{advisor.rateLimitTier} tier</span>
      <span aria-hidden>·</span>
      <span>
        Fast: {fastUsed ?? "—"}/{fastCap === null ? "∞" : fastCap} today
      </span>
      <span aria-hidden>·</span>
      <span>
        Deep: {deepUsed ?? "—"}/{deepCap === null ? "∞" : deepCap} today
      </span>
      {snapshot?.degraded ? (
        <>
          <span aria-hidden>·</span>
          <span
            className="text-amber-600 dark:text-amber-400"
            title="Counter service unavailable; showing tier caps only."
          >
            usage unavailable
          </span>
        </>
      ) : null}
    </div>
  );
}
