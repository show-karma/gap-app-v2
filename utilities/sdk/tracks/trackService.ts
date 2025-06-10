import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { errorManager } from "@/components/Utilities/errorManager";
import {
  ITrackResponse,
  ITrackAssignmentResponse,
  IProjectTrackResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

/**
 * Fetches tracks for a community
 */
export const fetchCommunityTracks = async (
  communityUID: string,
  includeArchived: boolean = false
): Promise<ITrackResponse[]> => {
  try {
    const response = await gapIndexerApi.getTracks(
      communityUID,
      includeArchived
    );
    return response.data;
  } catch (error: any) {
    errorManager(`Error fetching tracks for community ${communityUID}`, error);
    throw new Error(`Failed to fetch tracks: ${error.message}`);
  }
};

/**
 * Fetches a single track by ID
 */
export const fetchTrackById = async (id: string): Promise<ITrackResponse> => {
  try {
    const response = await gapIndexerApi.getTrackById(id);
    return response.data;
  } catch (error: any) {
    errorManager(`Error fetching track ${id}`, error);
    throw new Error(`Failed to fetch track: ${error.message}`);
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
  } catch (error: any) {
    errorManager(`Error creating track for community ${communityUID}`, error);
    throw new Error(`Failed to create track: ${error.message}`);
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
  } catch (error: any) {
    errorManager(`Error updating track ${id}`, error);
    throw new Error(`Failed to update track: ${error.message}`);
  }
};

/**
 * Archives a track
 */
export const archiveTrack = async (id: string): Promise<ITrackResponse> => {
  try {
    const response = await gapIndexerApi.archiveTrack(id);
    return response.data;
  } catch (error: any) {
    errorManager(`Error archiving track ${id}`, error);
    throw new Error(`Failed to archive track: ${error.message}`);
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
    const response = await gapIndexerApi.assignTracksToProgram(
      programId,
      trackIds
    );
    return response.data;
  } catch (error: any) {
    errorManager(`Error assigning tracks to program ${programId}`, error);
    throw new Error(`Failed to assign tracks: ${error.message}`);
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
    const response = await gapIndexerApi.unassignTrackFromProgram(
      programId,
      trackId
    );
    return response.data;
  } catch (error: any) {
    errorManager(
      `Error removing track ${trackId} from program ${programId}`,
      error
    );
    throw new Error(`Failed to unassign track: ${error.message}`);
  }
};

/**
 * Fetches tracks for a program
 */
export const fetchProgramTracks = async (
  programId: string
): Promise<ITrackResponse[]> => {
  try {
    const response = await gapIndexerApi.getTracksForProgram(programId);
    return response.data;
  } catch (error: any) {
    errorManager(`Error fetching tracks for program ${programId}`, error);
    throw new Error(`Failed to fetch program tracks: ${error.message}`);
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
    const response = await gapIndexerApi.getTracksForProject(
      projectId,
      programId,
      activeOnly
    );
    return response.data;
  } catch (error: any) {
    errorManager(
      `Error fetching tracks for project ${projectId} in program ${programId}`,
      error
    );
    throw new Error(`Failed to fetch project tracks: ${error.message}`);
  }
};

/**
 * Assigns tracks to a project
 */
export const assignTracksToProject = async (
  projectId: string,
  programId: string,
  trackIds: string[]
): Promise<any[]> => {
  try {
    const response = await gapIndexerApi.assignTracksToProject(
      projectId,
      programId,
      trackIds
    );
    return response.data;
  } catch (error: any) {
    errorManager(`Error assigning tracks to project ${projectId}`, error);
    throw new Error(`Failed to assign tracks to project: ${error.message}`);
  }
};

/**
 * Removes tracks from a project
 */
export const unassignTracksFromProject = async (
  projectId: string,
  programId: string,
  trackIds: string[]
): Promise<any[]> => {
  try {
    const response = await gapIndexerApi.unassignTracksFromProject(
      projectId,
      programId,
      trackIds
    );
    return response.data;
  } catch (error: any) {
    errorManager(`Error removing tracks from project ${projectId}`, error);
    throw new Error(`Failed to unassign tracks from project: ${error.message}`);
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
    const response = await gapIndexerApi.getProjectsByTrack(
      communityId,
      programId,
      trackId
    );
    return response.data;
  } catch (error: any) {
    errorManager(
      `Error fetching projects by track for program ${programId}`,
      error
    );
    throw new Error(`Failed to fetch projects by track: ${error.message}`);
  }
};
