"use client";

import pluralize from "pluralize";
import type { ReactNode } from "react";
import { useState } from "react";
import type { Hex } from "viem";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useAuth } from "@/hooks/useAuth";
import { useEFP } from "@/store/efp";
import { getEfpProfileUrl } from "@/utilities/fetchEFP";

interface AddressEfpHoverCardProps {
  address: string;
  children: ReactNode;
  className?: string;
}

function EfpHoverCardBody({ address }: { address: string }) {
  const lower = address.toLowerCase() as Hex;
  const efpEntry = useEFP((s) => s.efpData[lower]);
  const populateEfp = useEFP((s) => s.populateEfp);

  if (efpEntry?.isFetching && efpEntry.followers_count === undefined) {
    return <Skeleton className="h-12 w-full" data-testid="efp-hover-loading" />;
  }

  if (efpEntry?.error) {
    return (
      <div className="flex flex-col gap-2 text-sm">
        <span className="text-muted-foreground">Could not load EFP stats</span>
        <button
          type="button"
          className="text-left text-brand-blue hover:underline"
          onClick={() => populateEfp([address])}
        >
          Retry
        </button>
      </div>
    );
  }

  const followers = efpEntry?.followers_count ?? 0;
  const following = efpEntry?.following_count ?? 0;
  const commonCount = efpEntry?.commonFollowersLength ?? 0;

  return (
    <div className="flex flex-col gap-1 text-sm" data-testid="efp-hover-content">
      <ExternalLink href={getEfpProfileUrl(address)} className="font-medium hover:underline">
        {followers} {pluralize("follower", followers)} · {following} following
      </ExternalLink>
      {commonCount > 0 ? (
        <span className="text-muted-foreground">
          {commonCount} {pluralize("follower", commonCount)} you know
        </span>
      ) : null}
      <span className="text-xs text-muted-foreground">View on EFP</span>
    </div>
  );
}

export function AddressEfpHoverCard({ address, children, className }: AddressEfpHoverCardProps) {
  const [open, setOpen] = useState(false);
  const populateEfp = useEFP((s) => s.populateEfp);
  const populateCommonFollowers = useEFP((s) => s.populateCommonFollowers);
  const { address: viewerAddress, authenticated } = useAuth();

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen && address) {
      populateEfp([address]);
      if (authenticated && viewerAddress) {
        populateCommonFollowers(address, viewerAddress);
      }
    }
  };

  return (
    <HoverCard open={open} onOpenChange={handleOpenChange}>
      <HoverCardTrigger asChild className={className}>
        <span className="inline cursor-default">{children}</span>
      </HoverCardTrigger>
      <HoverCardContent data-testid="efp-hover-card">
        <EfpHoverCardBody address={address} />
      </HoverCardContent>
    </HoverCard>
  );
}
