import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { errorManager } from "@/components/Utilities/errorManager";
import { useAuth } from "@/hooks/useAuth";
import { useProjectStore } from "@/store/project";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";
import { QUERY_KEYS } from "@/utilities/queryKeys";
import { getRPCUrlByChainId } from "@/utilities/rpcClient";
import { useProjectInstance } from "./useProjectInstance";

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
  const { project: projectInstance } = useProjectInstance(projectId);

  const { setIsProjectAdmin, setIsProjectOwner } = useProjectStore();

  const checkPermissions = async (): Promise<ProjectPermissionsResult> => {
    // Early returns for invalid states
    if (!projectInstance || !isAuth || !isConnected || !address) {
      return { isProjectOwner: false, isProjectAdmin: false };
    }

    try {
      const rpcUrl = getRPCUrlByChainId(projectInstance.chainID);
      if (!rpcUrl) {
        return { isProjectOwner: false, isProjectAdmin: false };
      }
      const { JsonRpcProvider } = await import("ethers");
      const rpcProvider = new JsonRpcProvider(rpcUrl);

      const [isOwnerResult, isAdminResult] = await Promise.all([
        projectInstance?.isOwner(rpcProvider, address).catch((error) => {
          errorManager(
            `Error checking owner permissions for user ${address} on project ${projectId}`,
            error
          );
          return false;
        }),
        projectInstance?.isAdmin(rpcProvider, address).catch((error) => {
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
    } catch (error: any) {
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
    enabled: !!projectInstance && chainID !== null && !!isAuth && !!address,
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
