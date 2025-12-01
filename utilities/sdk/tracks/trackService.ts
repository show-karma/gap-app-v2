import type {
  IProjectTrackResponse,
  ITrackAssignmentResponse,
  ITrackResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { errorManager } from "@/components/Utilities/errorManager";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Fetches tracks for a community
 */
export const fetchCommunityTracks = async (
  communityUID: string,
  includeArchived: boolean = false
): Promise<ITrackResponse[]> => {
  try {
    const response = await gapIndexerApi.getTracks(communityUID, includeArchived);
    return response.data;
  } catch (error: unknown) {
    errorManager(`Error fetching tracks for community ${communityUID}`, error);
    throw new Error(`Failed to fetch tracks: ${getErrorMessage(error)}`);
  }
};

/**
 * Fetches a single track by ID
 */
export const fetchTrackById = async (id: string): Promise<ITrackResponse> => {
  try {
    const response = await gapIndexerApi.getTrackById(id);
    return response.data;
  } catch (error: unknown) {
    errorManager(`Error fetching track ${id}`, error);
    throw new Error(`Failed to fetch track: ${getErrorMessage(error)}`);
  }
};

/**
 * Creates a new track
 */
export const createTrack = async (
  name: string,
  communityUID: string,
  description?: string
): Promise<ITrackResponse> => {
  try {
    const response = await gapIndexerApi.createTrack({
      name,
      communityUID,
      description,
    });
    return response.data;
  } catch (error: unknown) {
    errorManager(`Error creating track for community ${communityUID}`, error);
    throw new Error(`Failed to create track: ${getErrorMessage(error)}`);
  }
};

/**
 * Updates an existing track
 */
export const updateTrack = async (
  id: string,
  data: { name?: string; description?: string; communityUID?: string }
): Promise<ITrackResponse> => {
  try {
    const response = await gapIndexerApi.updateTrack(id, data);
    return response.data;
  } catch (error: unknown) {
    errorManager(`Error updating track ${id}`, error);
    throw new Error(`Failed to update track: ${getErrorMessage(error)}`);
  }
};

/**
 * Archives a track
 */
export const archiveTrack = async (id: string): Promise<ITrackResponse> => {
  try {
    const response = await gapIndexerApi.archiveTrack(id);
    return response.data;
  } catch (error: unknown) {
    errorManager(`Error archiving track ${id}`, error);
    throw new Error(`Failed to archive track: ${getErrorMessage(error)}`);
  }
};

/**
 * Assigns tracks to a program
 */
export const assignTracksToProgram = async (
  programId: string,
  trackIds: string[]
): Promise<ITrackAssignmentResponse[]> => {
  try {
    const response = await gapIndexerApi.assignTracksToProgram(programId, trackIds);
    return response.data;
  } catch (error: unknown) {
    errorManager(`Error assigning tracks to program ${programId}`, error);
    throw new Error(`Failed to assign tracks: ${getErrorMessage(error)}`);
  }
};

/**
 * Removes a track from a program
 */
export const unassignTrackFromProgram = async (
  programId: string,
  trackId: string
): Promise<ITrackAssignmentResponse> => {
  try {
    const response = await gapIndexerApi.unassignTrackFromProgram(programId, trackId);
    return response.data;
  } catch (error: unknown) {
    errorManager(`Error removing track ${trackId} from program ${programId}`, error);
    throw new Error(`Failed to unassign track: ${getErrorMessage(error)}`);
  }
};

/**
 * Fetches tracks for a program
 */
export const fetchProgramTracks = async (programId: string): Promise<ITrackResponse[]> => {
  try {
    const response = await gapIndexerApi.getTracksForProgram(programId);
    return response.data;
  } catch (error: unknown) {
    errorManager(`Error fetching tracks for program ${programId}`, error);
    throw new Error(`Failed to fetch program tracks: ${getErrorMessage(error)}`);
  }
};

/**
 * Fetches tracks associated with a project in a program
 */
export const fetchProjectTracks = async (
  projectId: string,
  programId: string,
  activeOnly: boolean = true
): Promise<ITrackResponse[]> => {
  try {
    const response = await gapIndexerApi.getTracksForProject(projectId, programId, activeOnly);
    return response.data;
  } catch (error: unknown) {
    errorManager(`Error fetching tracks for project ${projectId} in program ${programId}`, error);
    throw new Error(`Failed to fetch project tracks: ${getErrorMessage(error)}`);
  }
};

/**
 * Assigns tracks to a project
 */
export const assignTracksToProject = async (
  projectId: string,
  programId: string,
  trackIds: string[]
): Promise<IProjectTrackResponse[]> => {
  try {
    const response = await gapIndexerApi.assignTracksToProject(projectId, programId, trackIds);
    return response.data;
  } catch (error: unknown) {
    errorManager(`Error assigning tracks to project ${projectId}`, error);
    throw new Error(`Failed to assign tracks to project: ${getErrorMessage(error)}`);
  }
};

/**
 * Removes tracks from a project
 */
export const unassignTracksFromProject = async (
  projectId: string,
  programId: string,
  trackIds: string[]
): Promise<IProjectTrackResponse[]> => {
  try {
    const response = await gapIndexerApi.unassignTracksFromProject(projectId, programId, trackIds);
    return response.data;
  } catch (error: unknown) {
    errorManager(`Error removing tracks from project ${projectId}`, error);
    throw new Error(`Failed to unassign tracks from project: ${getErrorMessage(error)}`);
  }
};

/**
 * Fetches projects associated with a community and program, optionally filtered by track
 */
export const fetchProjectsByTrack = async (
  communityId: string,
  programId: string,
  trackId?: string
): Promise<IProjectTrackResponse[]> => {
  try {
    const response = await gapIndexerApi.getProjectsByTrack(communityId, programId, trackId);
    return response.data;
  } catch (error: unknown) {
    errorManager(`Error fetching projects by track for program ${programId}`, error);
    throw new Error(`Failed to fetch projects by track: ${getErrorMessage(error)}`);
  }
};
