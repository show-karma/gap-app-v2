import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { envVars } from "@/utilities/enviromentVars";
import { errorManager } from "@/components/Utilities/errorManager";

export interface Track {
  id: string;
  name: string;
  description?: string;
  communityUID: string;
  isArchived: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  programId?: string;
  isActive?: boolean;
}

export const trackService = {
  // Get all tracks for a community
  getAllTracks: async (
    communityUID: string,
    includeArchived: boolean = false
  ): Promise<Track[]> => {
    try {
      const [data, error] = await fetchData(
        INDEXER.TRACKS.ALL(communityUID, includeArchived),
        "GET",
        {},
        {},
        {},
        true,
        false
      );

      if (error) {
        throw new Error(error);
      }

      return data.map((track: any) => ({
        ...track,
        createdAt: new Date(track.createdAt),
        updatedAt: new Date(track.updatedAt),
      }));
    } catch (error: any) {
      errorManager("Error fetching tracks", error);
      throw error;
    }
  },

  // Get tracks for a program
  getProgramTracks: async (programId: string): Promise<Track[]> => {
    try {
      const [data, error] = await fetchData(
        INDEXER.PROGRAMS.TRACKS(programId),
        "GET",
        {},
        {},
        {},
        true,
        false
      );

      if (error) {
        throw new Error(error);
      }

      return data.map((track: any) => ({
        ...track,
        createdAt: new Date(track.createdAt),
        updatedAt: new Date(track.updatedAt),
      }));
    } catch (error: any) {
      errorManager(`Error fetching tracks for program ${programId}`, error);
      throw error;
    }
  },

  // Create a new track
  createTrack: async (
    name: string,
    description: string,
    communityUID: string
  ): Promise<Track> => {
    try {
      const [data, error] = await fetchData(
        INDEXER.TRACKS.CREATE(),
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

      if (error) {
        throw new Error(error);
      }

      return {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      };
    } catch (error: any) {
      errorManager("Error creating track", error);
      throw error;
    }
  },

  // Update an existing track
  updateTrack: async (
    id: string,
    name: string,
    description?: string
  ): Promise<Track> => {
    try {
      const [data, error] = await fetchData(
        INDEXER.TRACKS.UPDATE(id),
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

      if (error) {
        throw new Error(error);
      }

      return {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      };
    } catch (error: any) {
      errorManager("Error updating track", error);
      throw error;
    }
  },

  // Archive a track
  archiveTrack: async (id: string): Promise<void> => {
    try {
      const [, error] = await fetchData(
        INDEXER.TRACKS.ARCHIVE(id),
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
    } catch (error: any) {
      errorManager("Error archiving track", error);
      throw error;
    }
  },

  // Assign tracks to a program
  assignTracksToProgram: async (
    programId: string,
    trackIds: string[]
  ): Promise<void> => {
    try {
      const [, error] = await fetchData(
        INDEXER.PROGRAMS.TRACKS_ASSIGN(programId),
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
    } catch (error: any) {
      errorManager("Error assigning tracks to program", error);
      throw error;
    }
  },

  // Remove a track from a program
  removeTrackFromProgram: async (
    programId: string,
    trackId: string
  ): Promise<void> => {
    try {
      const [, error] = await fetchData(
        INDEXER.PROGRAMS.TRACKS_REMOVE(programId, trackId),
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
    } catch (error: any) {
      errorManager("Error removing track from program", error);
      throw error;
    }
  },

  // Get tracks for a project
  getProjectTracks: async (projectId: string): Promise<Track[]> => {
    try {
      const [data, error] = await fetchData(
        INDEXER.PROJECTS.TRACKS(projectId),
        "GET",
        {},
        {},
        {},
        true,
        false
      );

      if (error) {
        throw new Error(error);
      }

      return data.data || [];
    } catch (error: any) {
      errorManager(`Error fetching tracks for project ${projectId}`, error);
      throw error;
    }
  },

  // Assign tracks to a project
  assignTracksToProject: async (
    projectId: string,
    trackIds: string[],
    programId: string
  ): Promise<void> => {
    try {
      const [, error] = await fetchData(
        INDEXER.PROJECTS.TRACKS(projectId),
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
    } catch (error: any) {
      errorManager("Error assigning tracks to project", error);
      throw error;
    }
  },
};
