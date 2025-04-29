"use client";

import { useQuery } from "@tanstack/react-query";
import { Track } from "@/services/tracks";
import { useTracksForCommunity } from "./useTracks";

/**
 * Hook to fetch tracks by their IDs
 * @param communityId - The community ID
 * @param trackIds - Array of track IDs
 * @param programId - Optional program ID if tracks are program-specific
 * @returns Query object with tracks data filtered by the provided IDs
 */
export const useTracksById = (
  communityId: string,
  trackIds?: string[],
  programId?: string
) => {
  // First fetch all tracks for the community
  const tracksQuery = useTracksForCommunity(communityId);

  // Then filter the tracks by the provided trackIds
  return useQuery<Track[]>({
    queryKey: ["tracks-by-id", communityId, trackIds, programId],
    queryFn: async () => {
      if (!trackIds || trackIds.length === 0) return [];

      // Wait for community tracks to load
      if (tracksQuery.isLoading) {
        await tracksQuery.refetch();
      }

      const tracks = tracksQuery.data || [];
      return tracks.filter((track: Track) => trackIds.includes(track.id));
    },
    enabled:
      !!communityId && !!trackIds && trackIds.length > 0 && !!tracksQuery.data,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
