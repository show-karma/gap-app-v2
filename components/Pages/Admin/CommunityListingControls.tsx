"use client";
import debounce from "lodash.debounce";
import { useEffect, useMemo, useRef } from "react";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { Spinner } from "@/components/Utilities/Spinner";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCommunityConfig, useCommunityConfigMutation } from "@/hooks/useCommunityConfig";

interface CommunityListingControlsProps {
  slug: string;
  communityName: string;
}

/** Parse a rank input into a non-negative integer, or null if invalid. */
function parseRank(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return parsed;
}

/**
 * Owner-only editor for a community's public-directory listing: whether it
 * shows up in `GET /v2/communities` (`public`) and its position there
 * (`rank`, sorted DESC). Reuses the live `useCommunityConfig` hooks; only
 * `{ public, rank }` are ever PUT so the masked `slackWebhookUrls` the GET
 * returns are never written back.
 */
export function CommunityListingControls({ slug, communityName }: CommunityListingControlsProps) {
  const { data: config, isLoading } = useCommunityConfig(slug);
  const mutation = useCommunityConfigMutation();

  // Derived during render — never copied into state (a derived-state effect
  // would cost an extra render per keystroke and per server sync).
  // BE default: no config row (or `public` unset) = public. Mirror the
  // indexer directory filter `config.public !== false`.
  const isPublic = config?.public !== false;
  const serverRank = config?.rank ?? 0;

  // The rank field is uncontrolled: typing writes straight to the DOM (no
  // re-render), and the debounced save reads the parsed value. `defaultValue`
  // re-seeds only on remount, which is fine — the only source that changes
  // `serverRank` is this component's own save, which echoes what was typed.
  const rankInputRef = useRef<HTMLInputElement>(null);

  // Live snapshot so the once-created debounced commit never captures stale
  // values (the mutation object gets a new identity on every render).
  const latest = useRef({ slug, serverRank, isPublic, mutate: mutation.mutate });
  latest.current = { slug, serverRank, isPublic, mutate: mutation.mutate };

  const commitRank = useMemo(
    () =>
      debounce((rank: number) => {
        const current = latest.current;
        if (rank !== current.serverRank) {
          current.mutate({ slug: current.slug, config: { public: current.isPublic, rank } });
        }
      }, 800),
    []
  );

  useEffect(() => () => commitRank.cancel(), [commitRank]);

  const handleRankChange = (value: string) => {
    const rank = parseRank(value);
    if (rank !== null) commitRank(rank);
  };

  const handlePublicChange = (checked: boolean) => {
    // Public toggles save immediately and carry any in-progress rank edit.
    commitRank.cancel();
    const typed = parseRank(rankInputRef.current?.value ?? "");
    mutation.mutate({ slug, config: { public: checked, rank: typed ?? serverRank } });
  };

  const publicCheckboxId = `community-public-${slug}`;
  const rankInputId = `community-rank-${slug}`;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-9 w-28" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Checkbox
          id={publicCheckboxId}
          checked={isPublic}
          onCheckedChange={(checked) => handlePublicChange(checked === true)}
          disabled={mutation.isPending}
          aria-label={`Toggle public listing for ${communityName}`}
        />
        <Label htmlFor={publicCheckboxId} className="cursor-pointer">
          Publicly listed
        </Label>
        {mutation.isPending && <Spinner className="h-3.5 w-3.5 border-2" />}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor={rankInputId} className="text-muted-foreground">
          Rank
        </Label>
        <div className="flex items-center gap-2">
          <Input
            ref={rankInputRef}
            id={rankInputId}
            type="number"
            min={0}
            defaultValue={serverRank}
            onChange={(e) => handleRankChange(e.target.value)}
            disabled={mutation.isPending}
            className="w-24"
            aria-label={`Listing rank for ${communityName}`}
          />
          {mutation.isPending && <Spinner className="h-3.5 w-3.5 border-2" />}
        </div>
        <p className="text-xs text-muted-foreground">
          Higher rank appears first on the public directory.
        </p>
      </div>

      {mutation.isError && (
        <p className="text-xs text-red-600 dark:text-red-400">Failed to save. Please try again.</p>
      )}
    </div>
  );
}
