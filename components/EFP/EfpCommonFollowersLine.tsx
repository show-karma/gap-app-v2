"use client";

import Image from "next/image";
import pluralize from "pluralize";
import type { Hex } from "viem";
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
        {preview.map((follower) =>
          follower.avatar ? (
            <Image
              key={follower.address}
              src={follower.avatar}
              alt=""
              width={24}
              height={24}
              unoptimized
              className="h-6 w-6 rounded-full border border-white dark:border-zinc-800 object-cover"
            />
          ) : (
            <span
              key={follower.address}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-white bg-zinc-200 text-[10px] dark:border-zinc-800 dark:bg-zinc-600"
              aria-hidden
            >
              ?
            </span>
          )
        )}
      </div>
      <span>
        {length} {pluralize("follower", length)} you know
      </span>
    </div>
  );
}
