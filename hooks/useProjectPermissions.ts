import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useProjectStore, useOwnerStore } from "@/store";
import { useAuthStore } from "@/store/auth";
import { errorManager } from "@/components/Utilities/errorManager";
import { getRPCClient } from "@/utilities/rpcClient";
import type { Project } from "@show-karma/karma-gap-sdk/core/class/entities/Project";
import type { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useAccount } from "wagmi";

interface ProjectPermissionsResult {
  isProjectOwner: boolean;
  isProjectAdmin: boolean;
}

export const useProjectPermissions = (
  projectId: string,
  project?: IProjectResponse,
  projectInstance?: Project
) => {
  const { address, isConnected } = useAccount();
  const { isAuth } = useAuthStore((state: any) => state.isAuth);
  const isOwner = useOwnerStore((state: any) => state.isOwner);
  
  const setIsProjectAdmin = useProjectStore((state: any) => state.setIsProjectAdmin);
  const setIsProjectAdminLoading = useProjectStore((state: any) => state.setIsProjectAdminLoading);
  const setIsProjectOwner = useProjectStore((state: any) => state.setIsProjectOwner);
  const setIsProjectOwnerLoading = useProjectStore((state: any) => state.setIsProjectOwnerLoading);

  const checkPermissions = async (): Promise<ProjectPermissionsResult> => {
    // Early returns for invalid states
    if (!projectInstance || !project?.chainID || !isAuth || !isConnected || !address) {
      return { isProjectOwner: false, isProjectAdmin: false };
    }

    // If user is global owner, they have all permissions
    if (isOwner) {
      return { isProjectOwner: true, isProjectAdmin: true };
    }

    try {
      const rpcClient = await getRPCClient(project.chainID);

      const [isOwnerResult, isAdminResult] = await Promise.all([
        projectInstance
          ?.isOwner(rpcClient as any, address)
          .catch(() => false),
        projectInstance
          ?.isAdmin(rpcClient as any, address)
          .catch(() => false),
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
    queryKey: ["project-permissions", projectId, address, project?.chainID, !!projectInstance],
    queryFn: checkPermissions,
    enabled: !!projectInstance && !!project?.chainID && !!isAuth && !!isConnected && !!address,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Update loading states based on query status
  React.useEffect(() => {
    if (!projectInstance || !project?.chainID || !isAuth || !isConnected || !address) {
      setIsProjectAdminLoading(false);
      setIsProjectOwnerLoading(false);
      setIsProjectAdmin(false);
      setIsProjectOwner(false);
      return;
    }

    if (query.isFetching) {
      setIsProjectAdminLoading(true);
      setIsProjectOwnerLoading(true);
    } else {
      setIsProjectAdminLoading(false);
      setIsProjectOwnerLoading(false);
    }
  }, [
    query.isFetching,
    projectInstance,
    project?.chainID,
    isAuth,
    isConnected,
    address,
    setIsProjectAdminLoading,
    setIsProjectOwnerLoading,
    setIsProjectAdmin,
    setIsProjectOwner,
  ]);

  // Update permission states when data changes
  React.useEffect(() => {
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