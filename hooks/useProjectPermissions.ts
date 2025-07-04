import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProjectStore, useOwnerStore } from "@/store";

import { errorManager } from "@/components/Utilities/errorManager";
import { getRPCClient } from "@/utilities/rpcClient";
import type { Project } from "@show-karma/karma-gap-sdk/core/class/entities/Project";
import type { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";
import { useProjectInstance } from "./useProjectInstance";
import { useWallet } from "./useWallet";

interface ProjectPermissionsResult {
  isProjectOwner: boolean;
  isProjectAdmin: boolean;
}

export const useProjectPermissions = () => {
  const { address, isLoggedIn } = useWallet();
  const { project } = useProjectStore();
  const projectId = project?.details?.data.slug || project?.uid;
  const { project: projectInstance } = useProjectInstance(projectId);

  const { setIsProjectAdmin, setIsProjectOwner } = useProjectStore();

  const checkPermissions = async (): Promise<ProjectPermissionsResult> => {
    // Early returns for invalid states
    if (!projectInstance || !isLoggedIn || !address) {
      return { isProjectOwner: false, isProjectAdmin: false };
    }

    try {
      const rpcClient = await getRPCClient(projectInstance.chainID);

      const [isOwnerResult, isAdminResult] = await Promise.all([
        projectInstance?.isOwner(rpcClient as any, address).catch(() => false),
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

  // Update permission states when data changes
  useEffect(() => {
    if (query.data) {
      setIsProjectOwner(query.data.isProjectOwner);
      setIsProjectAdmin(query.data.isProjectAdmin);
    }
  }, [query.data, setIsProjectOwner, setIsProjectAdmin]);

  return {
    isProjectOwner: query.data?.isProjectOwner ?? false,
    isProjectAdmin: query.data?.isProjectAdmin ?? false,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
};
