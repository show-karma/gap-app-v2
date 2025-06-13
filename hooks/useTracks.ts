"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTrackById, fetchProjectsByTrack } from "@/utilities/sdk/tracks";
import { trackService, Track } from "@/services/tracks";
import toast from "react-hot-toast";

// Query keys
export const TRACK_QUERY_KEYS = {
  all: ["tracks"] as const,
  community: (communityUID: string) =>
    [...TRACK_QUERY_KEYS.all, "community", communityUID] as const,
  program: (programId: string) =>
    [...TRACK_QUERY_KEYS.all, "program", programId] as const,
  project: (projectId: string) =>
    [...TRACK_QUERY_KEYS.all, "project", projectId] as const,
};

/**
 * Hook to fetch tracks for a community
 */
export const useTracksForCommunity = (
  communityUID: string,
  includeArchived: boolean = false
) => {
  return useQuery({
    queryKey: TRACK_QUERY_KEYS.community(communityUID),
    queryFn: () => trackService.getAllTracks(communityUID, includeArchived),
    enabled: !!communityUID,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch a single track by ID
 */
export const useTrack = (id: string) => {
  return useQuery({
    queryKey: ["track", id],
    queryFn: () => fetchTrackById(id),
    enabled: !!id,
  });
};

/**
 * Hook to create a new track
 */
export const useCreateTrack = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      name,
      description,
      communityUID,
    }: {
      name: string;
      description: string;
      communityUID: string;
    }) => trackService.createTrack(name, description, communityUID),
    onSuccess: (_, variables) => {
      toast.success("Track created successfully");
      queryClient.invalidateQueries({
        queryKey: TRACK_QUERY_KEYS.community(variables.communityUID),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create track");
    },
  });
};

/**
 * Hook to update a track
 */
export const useUpdateTrack = (communityUID: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      name,
      description,
    }: {
      id: string;
      name: string;
      description?: string;
    }) => trackService.updateTrack(id, name, description, communityUID),
    onSuccess: () => {
      toast.success("Track updated successfully");
      queryClient.invalidateQueries({
        queryKey: TRACK_QUERY_KEYS.community(communityUID),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update track");
    },
  });
};

/**
 * Hook to archive a track
 */
export const useArchiveTrack = (communityUID: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (trackId: string) =>
      trackService.archiveTrack(trackId, communityUID),
    onSuccess: () => {
      toast.success("Track archived successfully");
      queryClient.invalidateQueries({
        queryKey: TRACK_QUERY_KEYS.community(communityUID),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to archive track");
    },
  });
};

/**
 * Hook to fetch tracks for a program
 */
export const useTracksForProgram = (programId: string) => {
  return useQuery({
    queryKey: TRACK_QUERY_KEYS.program(programId),
    queryFn: () => trackService.getProgramTracks(programId),
    enabled: !!programId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to assign tracks to a program
 */
export const useAssignTracksToProgram = (
  programId: string,
  communityUID: string
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (trackIds: string[]) =>
      trackService.assignTracksToProgram(programId, trackIds, communityUID),
    onSuccess: () => {
      toast.success("Tracks assigned to program successfully");
      queryClient.invalidateQueries({
        queryKey: TRACK_QUERY_KEYS.program(programId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to assign tracks to program");
    },
  });
};

/**
 * Hook to remove a track from a program
 */
export const useRemoveTrackFromProgram = (
  programId: string,
  communityUID: string
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (trackId: string) =>
      trackService.removeTrackFromProgram(programId, trackId, communityUID),
    onSuccess: () => {
      toast.success("Track removed from program successfully");
      queryClient.invalidateQueries({
        queryKey: TRACK_QUERY_KEYS.program(programId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to remove track from program");
    },
  });
};

/**
 * Hook to remove multiple tracks from a program in batch
 */
export const useRemoveTracksFromProgramBatch = (
  programId: string,
  communityUID: string
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (trackIds: string[]) =>
      trackService.removeTracksFromProgramBatch(
        programId,
        trackIds,
        communityUID
      ),
    onSuccess: () => {
      toast.success("Tracks removed from program successfully");
      queryClient.invalidateQueries({
        queryKey: TRACK_QUERY_KEYS.program(programId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to remove tracks from program");
    },
  });
};

/**
 * Hook to fetch tracks for a project
 */
export const useTracksForProject = (
  projectId: string,
  communityUID: string
) => {
  return useQuery({
    queryKey: TRACK_QUERY_KEYS.project(projectId),
    queryFn: () => trackService.getProjectTracks(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to assign tracks to a project
 */
export const useAssignTracksToProject = (
  projectId: string,
  communityUID: string
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      trackIds,
      programId,
    }: {
      trackIds: string[];
      programId: string;
      communityUID: string;
    }) =>
      trackService.assignTracksToProject(
        projectId,
        trackIds,
        programId,
        communityUID
      ),
    onSuccess: () => {
      toast.success("Tracks assigned to project successfully");
      queryClient.invalidateQueries({
        queryKey: TRACK_QUERY_KEYS.project(projectId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to assign tracks to project");
    },
  });
};

/**
 * Hook to unassign tracks from a project
 */
export const useUnassignTracksFromProject = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      trackIds,
      programId,
    }: {
      trackIds: string[];
      programId: string;
    }) => {
      // Since we don't have a direct method for this, we'll use a noop function
      // The API doesn't expose this functionality yet
      console.warn(
        "Unassign tracks from project not yet implemented in the service"
      );
      return Promise.resolve();
    },
    onSuccess: () => {
      toast.success("Tracks removed from project successfully");
      queryClient.invalidateQueries({
        queryKey: TRACK_QUERY_KEYS.project(projectId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to remove tracks from project");
    },
  });
};
/**
 * Hook to fetch projects by track
 */
export const useProjectsByTrack = (
  communityId: string,
  programId: string,
  trackId?: string
) => {
  return useQuery({
    queryKey: ["projects-by-track", communityId, programId, trackId],
    queryFn: () => fetchProjectsByTrack(communityId, programId, trackId),
    enabled: !!communityId && !!programId,
  });
};
