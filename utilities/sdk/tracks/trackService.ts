import type {
  IProjectTrackResponse,
  ITrackAssignmentResponse,
  ITrackResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
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
 * Fetches tracks for a community (V2)
 */
export const fetchCommunityTracks = async (
  communityUID: string,
  includeArchived: boolean = false
): Promise<ITrackResponse[]> => {
  try {
    const [data, error] = await fetchData<Track[]>(
      INDEXER.V2.TRACKS.LIST(communityUID, includeArchived),
      "GET",
      {},
      {},
      {},
      false,
      false
    );

    if (error || !data) {
      throw new Error(error || "Failed to fetch tracks");
    }

    return data.map(mapToSdkTrack);
  } catch (error: unknown) {
    errorManager(`Error fetching tracks for community ${communityUID}`, error);
    throw new Error(`Failed to fetch tracks: ${getErrorMessage(error)}`);
  }
};

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

/**
 * Creates a new track (V2)
 */
export const createTrack = async (
  name: string,
  communityUID: string,
  description?: string
): Promise<ITrackResponse> => {
  try {
    const [data, error] = await fetchData<Track>(
      INDEXER.V2.TRACKS.CREATE(),
      "POST",
      {
        name,
        communityUID,
        description,
      },
      {},
      {},
      true,
      false
    );

    if (error || !data) {
      throw new Error(error || "Failed to create track");
    }

    return mapToSdkTrack(data);
  } catch (error: unknown) {
    errorManager(`Error creating track for community ${communityUID}`, error);
    throw new Error(`Failed to create track: ${getErrorMessage(error)}`);
  }
};

/**
 * Updates an existing track (V2)
 */
export const updateTrack = async (
  id: string,
  data: { name?: string; description?: string; communityUID?: string }
): Promise<ITrackResponse> => {
  try {
    const [responseData, error] = await fetchData<Track>(
      INDEXER.V2.TRACKS.UPDATE(id),
      "PUT",
      data,
      {},
      {},
      true,
      false
    );

    if (error || !responseData) {
      throw new Error(error || "Failed to update track");
    }

    return mapToSdkTrack(responseData);
  } catch (error: unknown) {
    errorManager(`Error updating track ${id}`, error);
    throw new Error(`Failed to update track: ${getErrorMessage(error)}`);
  }
};

/**
 * Archives a track (V2)
 */
export const archiveTrack = async (id: string): Promise<ITrackResponse> => {
  try {
    const [data, error] = await fetchData<Track>(
      INDEXER.V2.TRACKS.ARCHIVE(id),
      "DELETE",
      {},
      {},
      {},
      true,
      false
    );

    if (error || !data) {
      throw new Error(error || "Failed to archive track");
    }

    return mapToSdkTrack(data);
  } catch (error: unknown) {
    errorManager(`Error archiving track ${id}`, error);
    throw new Error(`Failed to archive track: ${getErrorMessage(error)}`);
  }
};

/**
 * Assigns tracks to a program (V2)
 */
export const assignTracksToProgram = async (
  programId: string,
  trackIds: string[]
): Promise<ITrackAssignmentResponse[]> => {
  try {
    const [data, error] = await fetchData<ITrackAssignmentResponse[]>(
      INDEXER.V2.TRACKS.ASSIGN_TO_PROGRAM(programId),
      "POST",
      { trackIds },
      {},
      {},
      true,
      false
    );

    if (error || !data) {
      throw new Error(error || "Failed to assign tracks");
    }

    return data;
  } catch (error: unknown) {
    errorManager(`Error assigning tracks to program ${programId}`, error);
    throw new Error(`Failed to assign tracks: ${getErrorMessage(error)}`);
  }
};

/**
 * Removes a track from a program (V2)
 */
export const unassignTrackFromProgram = async (
  programId: string,
  trackId: string
): Promise<void> => {
  try {
    const [, error] = await fetchData(
      INDEXER.V2.TRACKS.UNASSIGN_FROM_PROGRAM(programId, trackId),
      "DELETE",
      {},
      {},
      {},
      true,
      false
    );

    if (error) {
      throw new Error(error);
    }
  } catch (error: unknown) {
    errorManager(`Error removing track ${trackId} from program ${programId}`, error);
    throw new Error(`Failed to unassign track: ${getErrorMessage(error)}`);
  }
};

/**
 * Fetches tracks for a program (V2)
 */
export const fetchProgramTracks = async (programId: string): Promise<ITrackResponse[]> => {
  try {
    const [data, error] = await fetchData<Track[]>(
      INDEXER.V2.TRACKS.PROGRAM_TRACKS(programId),
      "GET",
      {},
      {},
      {},
      false,
      false
    );

    if (error || !data) {
      throw new Error(error || "Failed to fetch program tracks");
    }

    return data.map(mapToSdkTrack);
  } catch (error: unknown) {
    errorManager(`Error fetching tracks for program ${programId}`, error);
    throw new Error(`Failed to fetch program tracks: ${getErrorMessage(error)}`);
  }
};

/**
 * Fetches tracks associated with a project in a program (V2)
 */
export const fetchProjectTracks = async (
  projectId: string,
  programId: string,
  _activeOnly: boolean = true
): Promise<ITrackResponse[]> => {
  try {
    const [data, error] = await fetchData<Track[]>(
      INDEXER.V2.TRACKS.PROJECT_TRACKS(projectId, programId),
      "GET",
      {},
      {},
      {},
      false,
      false
    );

    if (error || !data) {
      throw new Error(error || "Failed to fetch project tracks");
    }

    return data.map(mapToSdkTrack);
  } catch (error: unknown) {
    errorManager(`Error fetching tracks for project ${projectId} in program ${programId}`, error);
    throw new Error(`Failed to fetch project tracks: ${getErrorMessage(error)}`);
  }
};

/**
 * Assigns tracks to a project (V2)
 */
export const assignTracksToProject = async (
  projectId: string,
  programId: string,
  trackIds: string[]
): Promise<IProjectTrackResponse[]> => {
  try {
    const [data, error] = await fetchData<IProjectTrackResponse[]>(
      INDEXER.V2.TRACKS.ASSIGN_TO_PROJECT(projectId),
      "POST",
      { trackIds, programId },
      {},
      {},
      true,
      false
    );

    if (error || !data) {
      throw new Error(error || "Failed to assign tracks to project");
    }

    return data;
  } catch (error: unknown) {
    errorManager(`Error assigning tracks to project ${projectId}`, error);
    throw new Error(`Failed to assign tracks to project: ${getErrorMessage(error)}`);
  }
};

/**
 * Removes tracks from a project (V2)
 */
export const unassignTracksFromProject = async (
  projectId: string,
  programId: string,
  trackIds: string[]
): Promise<void> => {
  try {
    const [, error] = await fetchData(
      INDEXER.V2.TRACKS.UNASSIGN_FROM_PROJECT(programId, projectId),
      "DELETE",
      { trackIds },
      {},
      {},
      true,
      false
    );

    if (error) {
      throw new Error(error);
    }
  } catch (error: unknown) {
    errorManager(`Error removing tracks from project ${projectId}`, error);
    throw new Error(`Failed to unassign tracks from project: ${getErrorMessage(error)}`);
  }
};

/**
 * Fetches projects associated with a community and program, optionally filtered by track (V2)
 */
export const fetchProjectsByTrack = async (
  communityId: string,
  programId: string,
  trackId?: string
): Promise<IProjectTrackResponse[]> => {
  try {
    const [data, error] = await fetchData<IProjectTrackResponse[]>(
      INDEXER.V2.TRACKS.PROJECTS_BY_TRACK(communityId, programId, trackId),
      "GET",
      {},
      {},
      {},
      false,
      false
    );

    if (error || !data) {
      throw new Error(error || "Failed to fetch projects by track");
    }

    return data;
  } catch (error: unknown) {
    errorManager(`Error fetching projects by track for program ${programId}`, error);
    throw new Error(`Failed to fetch projects by track: ${getErrorMessage(error)}`);
  }
};
