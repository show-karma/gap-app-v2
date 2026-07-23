import { z } from "zod";
import { errorManager } from "@/components/Utilities/errorManager";
import { api } from "@/utilities/api/client";
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
const TrackAPIResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    communityUID: z.string(),
    isArchived: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
    programId: z.string().optional(),
    isActive: z.boolean().optional(),
  })
  .passthrough();
type TrackAPIResponse = z.infer<typeof TrackAPIResponseSchema>;

const GetTracksV2ResponseSchema = z
  .object({
    tracks: z.array(TrackAPIResponseSchema).optional(),
  })
  .passthrough();
type GetTracksV2Response = z.infer<typeof GetTracksV2ResponseSchema>;

// Nested `track` shape isn't transformed/consumed further by this service —
// keep it untyped rather than inventing a stricter shape than reality.
const ProjectTrackResponseSchema = z
  .object({
    id: z.string(),
    projectUID: z.string(),
    trackId: z.string(),
    programId: z.string(),
    isActive: z.boolean(),
    track: z.unknown().optional(),
    createdAt: z.string(),
  })
  .passthrough();

const GetProjectTracksV2ResponseSchema = z
  .object({
    tracks: z.array(ProjectTrackResponseSchema).optional(),
  })
  .passthrough();
type GetProjectTracksV2Response = z.infer<typeof GetProjectTracksV2ResponseSchema>;

const ProjectByTrackAPIResponseSchema = z
  .object({
    projects: z.array(z.unknown()).optional(),
  })
  .passthrough();
type ProjectByTrackAPIResponse = z.infer<typeof ProjectByTrackAPIResponseSchema>;

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
      const data = await api.get<GetTracksV2Response>(
        INDEXER.V2.TRACKS.LIST(communityUID, includeArchived),
        { isAuthorized: false, schema: GetTracksV2ResponseSchema }
      );

      return (data.tracks || []).map(mapTrackResponse);
    } catch (error: unknown) {
      errorManager("Error fetching tracks", error);
      throw error;
    }
  },

  // Get tracks for a program (V2)
  getProgramTracks: async (programId: string): Promise<Track[]> => {
    try {
      // Normalize programId (remove chainId suffix if present) before sending to API
      const normalizedProgramId = programId.includes("_") ? programId.split("_")[0] : programId;
      const data = await api.get<GetTracksV2Response>(
        INDEXER.V2.TRACKS.PROGRAM_TRACKS(normalizedProgramId),
        { isAuthorized: false, schema: GetTracksV2ResponseSchema }
      );

      return (data.tracks || []).map(mapTrackResponse);
    } catch (error: unknown) {
      errorManager(`Error fetching tracks for program ${programId}`, error);
      throw error;
    }
  },

  // Create a new track (V2)
  createTrack: async (name: string, description: string, communityUID: string): Promise<Track> => {
    try {
      const data = await api.post<TrackAPIResponse>(
        INDEXER.V2.TRACKS.CREATE(),
        {
          name,
          description,
          communityUID,
        },
        { schema: TrackAPIResponseSchema }
      );

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
      const data = await api.put<TrackAPIResponse>(
        INDEXER.V2.TRACKS.UPDATE(id),
        {
          name,
          description,
        },
        { schema: TrackAPIResponseSchema }
      );

      return mapTrackResponse(data);
    } catch (error: unknown) {
      errorManager("Error updating track", error);
      throw error;
    }
  },

  // Archive a track (V2)
  archiveTrack: async (id: string, _communityUID?: string): Promise<Track> => {
    try {
      const data = await api.delete<TrackAPIResponse>(INDEXER.V2.TRACKS.ARCHIVE(id), {
        schema: TrackAPIResponseSchema,
      });

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
      // Normalize programId (remove chainId suffix if present) before sending to API
      const normalizedProgramId = programId.includes("_") ? programId.split("_")[0] : programId;
      await api.post(INDEXER.V2.TRACKS.ASSIGN_TO_PROGRAM(normalizedProgramId), { trackIds });
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
      // Normalize programId (remove chainId suffix if present) before sending to API
      const normalizedProgramId = programId.includes("_") ? programId.split("_")[0] : programId;
      await api.delete(INDEXER.V2.TRACKS.UNASSIGN_FROM_PROGRAM(normalizedProgramId, trackId));
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
      // Normalize programId (remove chainId suffix if present) before sending to API
      const normalizedProgramId = programId.includes("_") ? programId.split("_")[0] : programId;
      await Promise.all(
        trackIds.map((trackId) =>
          api.delete(INDEXER.V2.TRACKS.UNASSIGN_FROM_PROGRAM(normalizedProgramId, trackId))
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
      // Normalize programId (remove chainId suffix if present) before sending to API
      const normalizedProgramId = programId.includes("_") ? programId.split("_")[0] : programId;
      const data = await api.get<GetProjectTracksV2Response>(
        INDEXER.V2.TRACKS.PROJECT_TRACKS(projectId, normalizedProgramId),
        { isAuthorized: false, schema: GetProjectTracksV2ResponseSchema }
      );

      return (data.tracks || []) as ProjectTrack[];
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
      // Normalize programId (remove chainId suffix if present) before sending to API
      const normalizedProgramId = programId.includes("_") ? programId.split("_")[0] : programId;
      await api.post(INDEXER.V2.TRACKS.ASSIGN_TO_PROJECT(projectId), {
        trackIds,
        programId: normalizedProgramId,
      });
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
      // Normalize programId (remove chainId suffix if present) before sending to API
      const normalizedProgramId = programId.includes("_") ? programId.split("_")[0] : programId;
      // DELETE with a body isn't exposed on api.delete(); use the low-level
      // request() escape hatch (still throws on failure like the rest of the client).
      await api.request(
        "DELETE",
        INDEXER.V2.TRACKS.UNASSIGN_FROM_PROJECT(normalizedProgramId, projectId),
        { trackIds }
      );
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
      // Normalize programId (remove chainId suffix if present) before sending to API
      const normalizedProgramId = programId.includes("_") ? programId.split("_")[0] : programId;
      const data = await api.get<ProjectByTrackAPIResponse>(
        INDEXER.V2.TRACKS.PROJECTS_BY_TRACK(communityId, normalizedProgramId, trackId),
        { isAuthorized: false, schema: ProjectByTrackAPIResponseSchema }
      );

      return data.projects || [];
    } catch (error: unknown) {
      errorManager("Error fetching projects by track", error);
      throw error;
    }
  },
};
