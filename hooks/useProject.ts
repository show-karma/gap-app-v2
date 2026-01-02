import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getProject } from "@/services/project.service";
import { useProjectStore } from "@/store";
import type { Project as ProjectResponse } from "@/types/v2/project";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";

export const useProject = (projectId: string) => {
  const setProject = useProjectStore((state) => state.setProject);

  const query = useQuery({
    queryKey: ["project", projectId],
    queryFn: async (): Promise<ProjectResponse> => {
      const data = await getProject(projectId);
      if (!data) {
        throw new Error("Project not found");
      }
      return data;
    },
    enabled: !!projectId,
    ...defaultQueryOptions,
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
    isFetching: query.isFetching,
  };
};
