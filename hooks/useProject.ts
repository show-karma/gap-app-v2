import { useQuery } from "@tanstack/react-query";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useProjectStore } from "@/store";
import { useEffect } from "react";

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
