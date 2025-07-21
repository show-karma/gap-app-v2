import { getProjectById } from "@/features/projects/api/sdk";
import { Project } from "@show-karma/karma-gap-sdk/core/class/entities/Project";
import { useQuery } from "@tanstack/react-query";

const useProjectInstance = (projectId?: string) => {
  const query = useQuery({
    queryKey: ["project-instance", projectId],
    queryFn: async (): Promise<Project | undefined> => {
      if (!projectId) return;
      const fetchedProject = await getProjectById(projectId);
      return fetchedProject;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    project: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isError: query.isError,
  };
};

export default useProjectInstance;
