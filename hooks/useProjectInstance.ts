import { getProjectById } from "@/utilities/sdk";
import { Project } from "@show-karma/karma-gap-sdk/core/class/entities/Project";
import { useQuery } from "@tanstack/react-query";

export const useProjectInstance = (projectId: string) => {
  const query = useQuery({
    queryKey: ["project", projectId],
    queryFn: async (): Promise<Project | undefined> => {
      const fetchedProject = await getProjectById(projectId);
      return fetchedProject;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  return {
    project: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isError: query.isError,
  };
};
