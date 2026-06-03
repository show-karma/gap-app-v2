"use client";

import pluralize from "pluralize";
import { useEffect } from "react";
import type { Hex } from "viem";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { useEFP } from "@/store/efp";
import { getEfpProfileUrl } from "@/utilities/fetchEFP";
import { cn } from "@/utilities/tailwind";

interface EfpStatsLineProps {
  address: string;
  className?: string;
  variant?: "default" | "compact";
}

export function EfpStatsLine({ address, className, variant = "default" }: EfpStatsLineProps) {
  const lower = address?.toLowerCase() as Hex;
  const efpEntry = useEFP((s) => s.efpData[lower]);
  const populateEfp = useEFP((s) => s.populateEfp);
  const isCompact = variant === "compact";

  useEffect(() => {
    if (address && !efpEntry) {
      populateEfp([address]);
    }
  }, [address, efpEntry, populateEfp]);

  const isFetching = efpEntry?.isFetching;
  const hasError = efpEntry?.error && !isFetching;
  const followers = efpEntry?.followers_count ?? 0;
  const following = efpEntry?.following_count ?? 0;

  if (isFetching && efpEntry?.followers_count === undefined) {
    return (
      <div className={className} data-testid="member-efp-stats">
        <Skeleton className={cn(isCompact ? "h-3 w-32" : "h-4 w-48")} />
      </div>
    );
  }

  if (hasError) {
    return (
      <div
        className={cn(
          "flex flex-row items-center gap-2 text-zinc-500 dark:text-zinc-400",
          isCompact ? "text-xs" : "text-sm",
          className
        )}
        data-testid="member-efp-stats"
      >
        <span>Could not load EFP stats</span>
        <button
          type="button"
          className="text-brand-blue hover:underline"
          onClick={() => populateEfp([address])}
          data-testid="member-efp-retry"
        >
          Retry
        </button>
      </div>
    );
  }

  if (efpEntry === undefined) {
    return (
      <div className={className} data-testid="member-efp-stats">
        <Skeleton className={cn(isCompact ? "h-3 w-32" : "h-4 w-48")} />
      </div>
    );
  }

  const label = `${followers} ${pluralize("follower", followers)} · ${following} following`;

  return (
    <div className={className} data-testid="member-efp-stats">
      <ExternalLink
        href={getEfpProfileUrl(address)}
        className={cn(
          "text-zinc-500 dark:text-zinc-400 hover:text-brand-blue hover:underline",
          isCompact ? "text-xs text-muted-foreground" : "text-sm"
        )}
      >
        {label}
      </ExternalLink>
    </div>
  );
}
