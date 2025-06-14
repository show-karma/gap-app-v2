import { useQuery } from "@tanstack/react-query";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useProjectStore } from "@/store";
import { useEffect } from "react";

/**
 * React Query hook for fetching project data
 * Automatically updates the Zustand store with the fetched data
 */
export const useProject = (projectId: string) => {
  const setProject = useProjectStore((state) => state.setProject);
  
  const query = useQuery({
    queryKey: ["project", projectId],
    queryFn: async (): Promise<IProjectResponse> => {
      const response = await gapIndexerApi.projectBySlug(projectId);
      return response.data;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  // Update Zustand store when data changes
  useEffect(() => {
    if (query.data) {
      setProject(query.data);
    }
  }, [query.data, setProject]);

  return {
    project: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isError: query.isError,
  };
};

/**
 * Hook that only returns the project from Zustand store
 * Use this when you only need the current project state without fetching
 */
export const useProjectData = () => {
  return useProjectStore((state) => ({
    project: state.project,
    loading: state.loading,
    setProject: state.setProject,
    setLoading: state.setLoading,
  }));
}; 