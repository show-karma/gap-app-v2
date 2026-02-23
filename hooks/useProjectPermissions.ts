import { GapContract } from "@show-karma/karma-gap-sdk/core/class/contract/GapContract";
import { useQuery } from "@tanstack/react-query";
import { ethers } from "ethers";
import { useEffect, useMemo } from "react";
import { errorManager } from "@/components/Utilities/errorManager";
import { useAuth } from "@/hooks/useAuth";
import { useProjectStore } from "@/store";
import { getGapRpcConfig } from "@/utilities/gapRpcConfig";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";
import { QUERY_KEYS } from "@/utilities/queryKeys";
import { getRPCUrlByChainId } from "@/utilities/rpcClient";

interface ProjectPermissionsResult {
  isProjectOwner: boolean;
  isProjectAdmin: boolean;
}

export const useProjectPermissions = () => {
  // Use address from useAuth() instead of useAccount() to get the correct address
  // for email/embedded wallet users (useAccount returns MetaMask if connected)
  const { address, isConnected, authenticated: isAuth } = useAuth();
  const { project } = useProjectStore();
  const projectId = project?.details?.slug || project?.uid;

  const { setIsProjectAdmin, setIsProjectOwner } = useProjectStore();

  const checkPermissions = async (): Promise<ProjectPermissionsResult> => {
    // Early returns for invalid states
    if (!project?.uid || !project?.chainID || !isAuth || !isConnected || !address) {
      return { isProjectOwner: false, isProjectAdmin: false };
    }

    try {
      const rpcUrl = getRPCUrlByChainId(project.chainID);
      if (!rpcUrl) {
        return { isProjectOwner: false, isProjectAdmin: false };
      }
      const rpcProvider = new ethers.JsonRpcProvider(rpcUrl);
      const rpcConfig = getGapRpcConfig();

      const [isOwnerResult, isAdminResult] = await Promise.all([
        GapContract.isProjectOwner(
          rpcProvider,
          project.uid,
          project.chainID,
          address,
          rpcConfig
        ).catch((error) => {
          errorManager(
            `Error checking owner permissions for user ${address} on project ${projectId}`,
            error
          );
          return false;
        }),
        GapContract.isProjectAdmin(
          rpcProvider,
          project.uid,
          project.chainID,
          address,
          rpcConfig
        ).catch((error) => {
          errorManager(
            `Error checking admin permissions for user ${address} on project ${projectId}`,
            error
          );
          return false;
        }),
      ]);

      return {
        isProjectOwner: isOwnerResult,
        isProjectAdmin: isAdminResult,
      };
    } catch (error: unknown) {
      errorManager(`Error checking permissions for user ${address} on project ${projectId}`, error);
      return { isProjectOwner: false, isProjectAdmin: false };
    }
  };

  // Normalize chainID to null to prevent query key instability when project loads
  const chainID = project?.chainID ?? null;

  // Memoize query key to ensure stable reference
  const queryKey = useMemo(
    () =>
      QUERY_KEYS.PROJECT.PERMISSIONS({
        address: address ?? null,
        projectId: projectId ?? null,
        chainID,
        isAuth,
      }),
    [address, projectId, chainID, isAuth]
  );

  const query = useQuery({
    queryKey,
    queryFn: checkPermissions,
    enabled: !!project?.uid && chainID !== null && !!isAuth && !!address,
    ...defaultQueryOptions,
    gcTime: 1 * 60 * 1000, // 1 minutes
  });

  // Update permission states when data changes
  useEffect(() => {
    if (!isAuth) {
      setIsProjectOwner(false);
      setIsProjectAdmin(false);
      return;
    }
    if (query.data) {
      setIsProjectOwner(query.data.isProjectOwner);
      setIsProjectAdmin(query.data.isProjectAdmin);
    }
  }, [query.data, setIsProjectOwner, setIsProjectAdmin, isAuth]);

  return {
    isProjectOwner: query.data?.isProjectOwner ?? false,
    isProjectAdmin: query.data?.isProjectAdmin ?? false,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
};
