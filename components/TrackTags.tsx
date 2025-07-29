"use client";

import React from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Spinner } from "./Utilities/Spinner";
import { TagIcon } from "@heroicons/react/24/outline";
import { useTracksForCommunity } from "@/hooks/useTracks";

interface TrackTagsProps {
  communityId: string;
  trackIds?: string[];
  className?: string;
  showLabel?: boolean;
  programId?: string;
}

export const TrackTags: React.FC<TrackTagsProps> = ({
  communityId,
  trackIds,
  className = "",
  showLabel = false,
}) => {
  const {
    data: communityTracks = [],
    isLoading,
    isError,
  } = useTracksForCommunity(communityId);

  const tracks = communityTracks.filter((track) =>
    trackIds?.includes(track.id)
  );

  if (!trackIds || trackIds.length === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <div
        className={`inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-300 ${className}`}
      >
        <Spinner className="h-3 w-3 mr-1" />
        Loading
      </div>
    );
  }

  if (isError || tracks.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {showLabel && tracks.length > 0 && (
        <span className="text-xs text-gray-500 dark:text-gray-400 mr-1 self-center flex items-center">
          <TagIcon className="w-3 h-3 mr-1" />
          Tracks
        </span>
      )}
      <div className="flex flex-wrap gap-1">
        {tracks.map((track) => (
          <Tooltip.Provider key={track.id}>
            <Tooltip.Root delayDuration={300}>
              <Tooltip.Trigger asChild>
                <div
                  className={`w-max cursor-help max-w-full inline-flex items-center gap-x-2 rounded-3xl bg-[#E0EAFF] dark:bg-zinc-800 dark:border-gray-800 text-black dark:text-gray-100 px-2 py-1 text-xs font-medium  ${className}`}
                >
                  {track.name}
                </div>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  className="max-w-xs rounded-lg bg-white p-2 text-sm text-gray-700 shadow-lg dark:bg-zinc-800 dark:text-gray-300 z-50"
                  sideOffset={5}
                  side="top"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{track.name}</span>
                    {track.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {track.description}
                      </p>
                    )}
                  </div>
                  <Tooltip.Arrow className="fill-white dark:fill-zinc-800" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        ))}
      </div>
    </div>
  );
};
