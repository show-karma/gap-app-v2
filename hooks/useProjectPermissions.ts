import { useQuery } from "@tanstack/react-query";

import { errorManager } from "@/components/Utilities/errorManager";
import { getRPCClient } from "@/utilities/rpcClient";

import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";
import { useProjectInstance } from "./useProjectInstance";
import { useWallet } from "./useWallet";
import { useProjectQuery } from "./useProjectQuery";

interface ProjectPermissionsResult {
  isProjectOwner: boolean;
  isProjectAdmin: boolean;
}

export const useProjectPermissions = () => {
  const { address, isLoggedIn } = useWallet();
  const { data: project } = useProjectQuery();
  const projectId = project?.details?.data.slug || project?.uid;
  const { project: projectInstance } = useProjectInstance(projectId);

  const checkPermissions = async (): Promise<ProjectPermissionsResult> => {
    if (!projectInstance || !isLoggedIn || !address) {
      return { isProjectOwner: false, isProjectAdmin: false };
    }

    try {
      const rpcClient = await getRPCClient(projectInstance.chainID);

      const [isOwnerResult, isAdminResult] = await Promise.all([
        projectInstance?.isOwner(rpcClient as any, address).catch((error) => {
          console.log("isOwner failed", error);
          return false;
        }),
        projectInstance?.isAdmin(rpcClient as any, address).catch(() => false),
      ]);

      return {
        isProjectOwner: isOwnerResult,
        isProjectAdmin: isAdminResult,
      };
    } catch (error: any) {
      errorManager(
        `Error checking permissions for user ${address} on project ${projectId}`,
        error
      );
      return { isProjectOwner: false, isProjectAdmin: false };
    }
  };

  const query = useQuery({
    queryKey: [
      "project-permissions",
      address,
      projectId,
      project?.chainID,
      isLoggedIn,
    ],
    queryFn: checkPermissions,
    enabled:
      !!projectInstance && !!project?.chainID && !!isLoggedIn && !!address,
    ...defaultQueryOptions,
    gcTime: 1 * 60 * 1000, // 1 minutes
  });

  return {
    isProjectOwner: query.data?.isProjectOwner ?? false,
    isProjectAdmin: query.data?.isProjectAdmin ?? false,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
};
