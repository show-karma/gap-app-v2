import { useQuery } from "@tanstack/react-query";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";
import { useParams } from "next/navigation";
import { useGrantStore } from "@/store/grant";

export const useProjectQuery = (projectIdOrSlug?: string) => {
  const { projectId: paramProjectId } = useParams();
  const projectId = (paramProjectId || projectIdOrSlug) as string;

  return useQuery({
    queryKey: ["project", projectId],
    queryFn: async (): Promise<IProjectResponse> => {
      const response = await gapIndexerApi.projectBySlug(projectId);
      const currentGrantState = useGrantStore.getState();
      const shareSameGrant = response?.data.grants?.find(
        (g) =>
          g.uid.toLowerCase() === currentGrantState.grant?.uid?.toLowerCase()
      );

      if (shareSameGrant) {
        currentGrantState.setGrant(shareSameGrant);
      }
      return response.data;
    },
    enabled: !!projectId,
    ...defaultQueryOptions,
  });
};
