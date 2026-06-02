"use client";

import { ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { useMemo } from "react";
import EthereumAddressToProfileName from "@/components/EthereumAddressToProfileName";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { useProjectStore } from "@/store";
import { useEFP } from "@/store/efp";

interface EfpFollowingSuggestionsProps {
  onRequestConnect?: () => void;
}

export function EfpFollowingSuggestions({ onRequestConnect }: EfpFollowingSuggestionsProps) {
  const project = useProjectStore((state) => state.project);
  const { address, authenticated } = useAuth();
  const viewerFollowing = useEFP((s) => s.viewerFollowing);
  const isFetchingFollowing = useEFP((s) => s.isFetchingFollowing);
  const followingError = useEFP((s) => s.followingError);
  const populateViewerFollowing = useEFP((s) => s.populateViewerFollowing);
  const [, copy] = useCopyToClipboard();

  const teamAddresses = useMemo(() => {
    if (!project) return new Set<string>();
    const addrs = [project.owner, ...(project.members?.map((m) => m.address) ?? [])].filter(
      Boolean
    ) as string[];
    return new Set(addrs.map((a) => a.toLowerCase()));
  }, [project]);

  const suggestions = useMemo(() => {
    if (!viewerFollowing?.length) return [];
    return viewerFollowing.filter((record) => !teamAddresses.has(record.address.toLowerCase()));
  }, [viewerFollowing, teamAddresses]);

  if (!authenticated || !address) {
    return (
      <div
        className="flex flex-col gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 mt-6"
        data-testid="efp-following-suggestions"
      >
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Suggestions from your EFP follows
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Connect your wallet to see addresses you follow on Ethereum Follow Protocol.
        </p>
        {onRequestConnect ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-max"
            onClick={onRequestConnect}
          >
            Connect wallet
          </Button>
        ) : null}
      </div>
    );
  }

  if (isFetchingFollowing) {
    return (
      <div
        className="flex flex-col gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 mt-6"
        data-testid="efp-following-suggestions"
      >
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Suggestions from your EFP follows
        </p>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (followingError) {
    return (
      <div
        className="flex flex-col gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 mt-6"
        data-testid="efp-following-suggestions"
      >
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Suggestions from your EFP follows
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Could not load your EFP follows.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-max"
          onClick={() => populateViewerFollowing(address)}
          data-testid="efp-following-retry"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!suggestions.length) {
    return (
      <div
        className="flex flex-col gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 mt-6"
        data-testid="efp-following-suggestions"
      >
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Suggestions from your EFP follows
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No new suggestions — everyone you follow on EFP is already on this team, or your follow
          list is empty.
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 mt-6 max-h-60 overflow-y-auto"
      data-testid="efp-following-suggestions"
    >
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        Suggestions from your EFP follows
      </p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Copy an address to share your invite link with them.
      </p>
      <ul className="flex flex-col gap-2">
        {suggestions.map((record) => (
          <li
            key={record.address}
            className="flex flex-row items-center justify-between gap-2 text-sm"
            data-testid="efp-following-suggestion-row"
          >
            <EthereumAddressToProfileName
              address={record.address}
              className="truncate text-zinc-800 dark:text-zinc-100"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0"
              aria-label={`Copy ${record.address}`}
              onClick={() => copy(record.address)}
            >
              <ClipboardDocumentIcon className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
