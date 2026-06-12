import type { ITrackResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { errorManager } from "@/components/Utilities/errorManager";
import type { Track } from "@/services/tracks";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// Map V2 Track to SDK ITrackResponse format
const mapToSdkTrack = (track: Track): ITrackResponse => ({
  id: track.id,
  name: track.name,
  description: track.description ?? "",
  communityUID: track.communityUID,
  isArchived: track.isArchived,
  createdAt: typeof track.createdAt === "string" ? track.createdAt : track.createdAt.toISOString(),
  updatedAt: typeof track.updatedAt === "string" ? track.updatedAt : track.updatedAt.toISOString(),
});

/**
 * Fetches a single track by ID (V2)
 */
export const fetchTrackById = async (id: string): Promise<ITrackResponse> => {
  try {
    const [data, error] = await fetchData<Track>(
      INDEXER.V2.TRACKS.BY_ID(id),
      "GET",
      {},
      {},
      {},
      false,
      false
    );

    if (error || !data) {
      throw new Error(error || "Track not found");
    }

    return mapToSdkTrack(data);
  } catch (error: unknown) {
    errorManager(`Error fetching track ${id}`, error);
    throw new Error(`Failed to fetch track: ${getErrorMessage(error)}`);
  }
};
