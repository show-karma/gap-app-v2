import { errorManager } from "@/components/Utilities/errorManager";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

export interface Track {
  id: string;
  name: string;
  description?: string | null;
  communityUID: string;
  isArchived: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  programId?: string;
  isActive?: boolean;
}

export interface ProjectTrack {
  id: string;
  projectUID: string;
  trackId: string;
  programId: string;
  isActive: boolean;
  track?: Track;
  createdAt: string;
}

// API response types (dates are strings from API)
interface TrackAPIResponse {
  id: string;
  name: string;
  description?: string | null;
  communityUID: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  programId?: string;
  isActive?: boolean;
}

interface GetTracksV2Response {
  tracks: TrackAPIResponse[];
}

interface GetProjectTracksV2Response {
  tracks: ProjectTrack[];
}

interface ProjectByTrackAPIResponse {
  projects: unknown[];
}

// Helper to map track from API response
const mapTrackResponse = (track: TrackAPIResponse): Track => ({
  ...track,
  createdAt: new Date(track.createdAt),
  updatedAt: new Date(track.updatedAt),
});

export const trackService = {
  // Get all tracks for a community (V2)
  getAllTracks: async (
    communityUID: string,
    includeArchived: boolean = false
  ): Promise<Track[]> => {
    try {
      const [data, error] = await fetchData<GetTracksV2Response>(
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

      return (data.tracks || []).map(mapTrackResponse);
    } catch (error: unknown) {
      errorManager("Error fetching tracks", error);
      throw error;
    }
  },

  // Get tracks for a program (V2)
  getProgramTracks: async (programId: string): Promise<Track[]> => {
    try {
      const [data, error] = await fetchData<GetTracksV2Response>(
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

      return (data.tracks || []).map(mapTrackResponse);
    } catch (error: unknown) {
      errorManager(`Error fetching tracks for program ${programId}`, error);
      throw error;
    }
  },

  // Create a new track (V2)
  createTrack: async (name: string, description: string, communityUID: string): Promise<Track> => {
    try {
      const [data, error] = await fetchData<TrackAPIResponse>(
        INDEXER.V2.TRACKS.CREATE(),
        "POST",
        {
          name,
          description,
          communityUID,
        },
        {},
        {},
        true,
        false
      );

      if (error || !data) {
        throw new Error(error || "Failed to create track");
      }

      return mapTrackResponse(data);
    } catch (error: unknown) {
      errorManager("Error creating track", error);
      throw error;
    }
  },

  // Update an existing track (V2)
  updateTrack: async (
    id: string,
    name: string,
    description?: string,
    _communityUID?: string // Not needed for V2
  ): Promise<Track> => {
    try {
      const [data, error] = await fetchData<TrackAPIResponse>(
        INDEXER.V2.TRACKS.UPDATE(id),
        "PUT",
        {
          name,
          description,
        },
        {},
        {},
        true,
        false
      );

      if (error || !data) {
        throw new Error(error || "Failed to update track");
      }

      return mapTrackResponse(data);
    } catch (error: unknown) {
      errorManager("Error updating track", error);
      throw error;
    }
  },

  // Archive a track (V2)
  archiveTrack: async (id: string, _communityUID?: string): Promise<Track> => {
    try {
      const [data, error] = await fetchData<TrackAPIResponse>(
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

      return mapTrackResponse(data);
    } catch (error: unknown) {
      errorManager("Error archiving track", error);
      throw error;
    }
  },

  // Assign tracks to a program (V2)
  assignTracksToProgram: async (
    programId: string,
    trackIds: string[],
    _communityUID?: string // Not needed for V2
  ): Promise<void> => {
    try {
      const [, error] = await fetchData(
        INDEXER.V2.TRACKS.ASSIGN_TO_PROGRAM(programId),
        "POST",
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
      errorManager("Error assigning tracks to program", error);
      throw error;
    }
  },

  // Remove a track from a program (V2)
  removeTrackFromProgram: async (
    programId: string,
    trackId: string,
    _communityUID?: string // Not needed for V2
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
      errorManager("Error removing track from program", error);
      throw error;
    }
  },

  // Remove multiple tracks from a program in batch (V2)
  removeTracksFromProgramBatch: async (
    programId: string,
    trackIds: string[],
    _communityUID?: string // Not needed for V2
  ): Promise<void> => {
    // For V2, we can remove tracks one by one or use a batch endpoint if available
    try {
      await Promise.all(
        trackIds.map((trackId) =>
          fetchData(
            INDEXER.V2.TRACKS.UNASSIGN_FROM_PROGRAM(programId, trackId),
            "DELETE",
            {},
            {},
            {},
            true,
            false
          )
        )
      );
    } catch (error: unknown) {
      errorManager("Error removing tracks from program in batch", error);
      throw error;
    }
  },

  // Get tracks for a project (V2)
  getProjectTracks: async (projectId: string, programId: string): Promise<ProjectTrack[]> => {
    try {
      const [data, error] = await fetchData<GetProjectTracksV2Response>(
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

      return data.tracks || [];
    } catch (error: unknown) {
      errorManager(`Error fetching tracks for project ${projectId}`, error);
      throw error;
    }
  },

  // Assign tracks to a project (V2)
  assignTracksToProject: async (
    projectId: string,
    trackIds: string[],
    programId: string,
    _communityUID?: string // Not needed for V2
  ): Promise<void> => {
    try {
      const [, error] = await fetchData(
        INDEXER.V2.TRACKS.ASSIGN_TO_PROJECT(projectId),
        "POST",
        { trackIds, programId },
        {},
        {},
        true,
        false
      );

      if (error) {
        throw new Error(error);
      }
    } catch (error: unknown) {
      errorManager("Error assigning tracks to project", error);
      throw error;
    }
  },

  // Unassign tracks from a project (V2)
  unassignTracksFromProject: async (
    programId: string,
    projectId: string,
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
      errorManager("Error unassigning tracks from project", error);
      throw error;
    }
  },

  // Get projects by track (V2)
  getProjectsByTrack: async (
    communityId: string,
    programId: string,
    trackId?: string
  ): Promise<unknown[]> => {
    try {
      const [data, error] = await fetchData<ProjectByTrackAPIResponse>(
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

      return data.projects || [];
    } catch (error: unknown) {
      errorManager("Error fetching projects by track", error);
      throw error;
    }
  },
};
