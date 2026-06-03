"use client";

import pluralize from "pluralize";
import type { Hex } from "viem";
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useEFP } from "@/store/efp";
import { cn } from "@/utilities/tailwind";

interface EfpCommonFollowersLineProps {
  target: string;
  className?: string;
}

export function EfpCommonFollowersLine({ target, className }: EfpCommonFollowersLineProps) {
  const { address: viewerAddress, authenticated } = useAuth();
  const targetHex = target?.toLowerCase() as Hex;
  const efpEntry = useEFP((s) => s.efpData[targetHex]);

  if (!authenticated || !viewerAddress) {
    return null;
  }

  if (efpEntry?.isFetchingCommon) {
    return (
      <div className={className} data-testid="member-efp-common-followers">
        <Skeleton className="h-4 w-40" />
      </div>
    );
  }

  const length = efpEntry?.commonFollowersLength ?? efpEntry?.commonFollowers?.length ?? 0;
  if (!length || !efpEntry?.commonFollowers?.length) {
    return null;
  }

  const preview = efpEntry.commonFollowers.slice(0, 3);

  return (
    <div
      className={cn(
        "flex flex-row flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400",
        className
      )}
      data-testid="member-efp-common-followers"
    >
      <div className="flex flex-row -space-x-2">
        {preview.map((follower) => (
          <ProfilePicture
            key={follower.address}
            imageURL={follower.avatar}
            name={follower.name || follower.address}
            size="24"
            alt=""
            className="h-6 w-6 border border-white dark:border-zinc-800"
          />
        ))}
      </div>
      <span>
        {length} {pluralize("follower", length)} you know
      </span>
    </div>
  );
}
