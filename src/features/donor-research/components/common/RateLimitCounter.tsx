"use client";

import { Sparkles } from "lucide-react";
import { useDonorCounters } from "@/hooks/useDonorAdvisor";
import type { DonorAdvisor, DonorResearchRateLimitTier } from "@/types/donor-research";

interface RateLimitCounterProps {
  advisor: DonorAdvisor;
  variant?: "inline" | "sidebar";
}

const FALLBACK_TIER_CAPS: Record<DonorResearchRateLimitTier, { fast: number | null }> = {
  beta: { fast: 10 },
  standard: { fast: 50 },
  unlimited: { fast: null },
};

function getSidebarStatus(degraded: boolean | undefined, limitReached: boolean): string {
  if (degraded) return "Usage temporarily unavailable";
  if (limitReached) return "Daily fast-report limit reached";
  return "Fast reports used today";
}

/**
 * Persistent header counter (U13d / F1 follow-up).
 *
 * Pulls today's consumed counts from `GET /v2/donor-research/me/counters`
 * via `useDonorCounters` (auto-refetches every 60s). Falls back to the
 * advisor's tier defaults when the counters endpoint is still loading or
 * the backend reported `degraded` (Redis unreachable).
 */
export function RateLimitCounter({ advisor, variant = "inline" }: RateLimitCounterProps) {
  const countersQuery = useDonorCounters(true);
  const fallbackCaps = FALLBACK_TIER_CAPS[advisor.rateLimitTier];

  const snapshot = countersQuery.data;
  // Loading and degraded states both fall through to "—" so the chip
  // never claims a fabricated consumed count.
  const showLive = !!snapshot && !snapshot.degraded;

  const fastCap = snapshot ? snapshot.fast.cap : fallbackCaps.fast;
  // The backend keeps counting past the cap (e.g. concurrent CI runs on one
  // identity), but "28 / 10" reads as a broken meter — clamp the display and
  // let the limit-reached styling carry the over-quota signal.
  const fastUsedRaw = showLive ? snapshot.fast.used : null;
  const fastUsed =
    fastUsedRaw !== null && fastCap !== null ? Math.min(fastUsedRaw, fastCap) : fastUsedRaw;
  const limitReached = fastUsedRaw !== null && fastCap !== null && fastUsedRaw >= fastCap;
  const title = snapshot?.degraded
    ? "Counter service unavailable; showing tier caps only."
    : undefined;

  if (variant === "sidebar") {
    return (
      <div
        className="rounded-md border border-sidebar-border bg-sidebar-accent/40 p-2.5 text-xs"
        title={title}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 font-medium text-sidebar-foreground">
            <Sparkles
              aria-hidden
              className="size-3.5 shrink-0 text-brand-emphasis dark:text-brand-subtle"
            />
            <span className="truncate capitalize">{advisor.rateLimitTier}</span>
          </span>
          <span className="shrink-0 font-mono tabular-nums text-sidebar-foreground">
            {fastUsed ?? "—"} / {fastCap === null ? "∞" : fastCap}
          </span>
        </div>
        <p className="mt-1 text-[11px] leading-4 text-sidebar-foreground/60">
          {getSidebarStatus(snapshot?.degraded, limitReached)}
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex items-stretch overflow-hidden rounded-md border border-border bg-background text-xs"
      title={title}
    >
      <div className="flex items-center gap-1.5 border-r border-border/60 px-2.5 py-1.5">
        <Sparkles className="h-3 w-3 text-brand-emphasis dark:text-brand-subtle" aria-hidden />
        <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          {advisor.rateLimitTier}
        </span>
      </div>
      <div className="flex items-baseline gap-1 px-2.5 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          Fast
        </span>
        <span className="font-mono tabular-nums text-foreground">{fastUsed ?? "—"}</span>
        <span className="text-[10px] text-muted-foreground">
          / {fastCap === null ? "∞" : fastCap}
        </span>
      </div>
      {limitReached && !snapshot?.degraded ? (
        <div className="flex items-center border-l border-border/60 px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          daily limit reached
        </div>
      ) : null}
      {snapshot?.degraded ? (
        <div className="flex items-center border-l border-amber-300/60 bg-amber-50 px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-amber-700 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300">
          usage offline
        </div>
      ) : null}
    </div>
  );
}
