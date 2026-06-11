import { useQuery } from "@tanstack/react-query";

import { useEffect, useMemo } from "react";
import { errorManager } from "@/components/Utilities/errorManager";
import { useAuth } from "@/hooks/useAuth";
import { useProjectStore } from "@/store";
import { compareAllWallets, getLinkedWalletAddresses } from "@/utilities/auth/compare-all-wallets";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";
import { QUERY_KEYS } from "@/utilities/queryKeys";
import { getRPCUrlByChainId } from "@/utilities/rpcClient";
import { useProjectInstance } from "./useProjectInstance";

interface ProjectPermissionsResult {
  isProjectOwner: boolean;
  isProjectAdmin: boolean;
}

export const useProjectPermissions = () => {
  const { address, isConnected, authenticated: isAuth, user } = useAuth();
  const project = useProjectStore((state) => state.project);
  const projectId = project?.details?.slug || project?.uid;
  const { project: projectInstance } = useProjectInstance(projectId);

  const setIsProjectAdmin = useProjectStore((state) => state.setIsProjectAdmin);
  const setIsProjectOwner = useProjectStore((state) => state.setIsProjectOwner);

  // Every address the authenticated account can act as: the active signer plus
  // ALL wallets linked to the Privy user. A single Privy account can carry more
  // than one wallet (e.g. two embedded wallets), and only one is "active" at a
  // time. On-chain owner/admin authority may sit on a *non-active* wallet, so we
  // must test every linked wallet — not just the active address — or the account
  // silently loses access whenever Privy surfaces a different wallet as active.
  const candidateAddresses = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const candidate of [address, ...(user ? getLinkedWalletAddresses(user) : [])]) {
      if (!candidate) continue;
      const key = candidate.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(candidate);
    }
    return result;
  }, [address, user]);

  // Order-independent signature of the candidate set for the query key, so
  // permissions recompute when the linked-wallet set changes but don't refetch
  // when only the active wallet toggles within the same set.
  const walletsKey = useMemo(
    () =>
      candidateAddresses.length
        ? candidateAddresses
            .map((candidate) => candidate.toLowerCase())
            .sort()
            .join(",")
        : null,
    [candidateAddresses]
  );

  const checkPermissions = async (): Promise<ProjectPermissionsResult> => {
    // Early returns for invalid states
    if (!isAuth || !isConnected || candidateAddresses.length === 0) {
      return { isProjectOwner: false, isProjectAdmin: false };
    }

    // Off-chain owner fallback: the indexer exposes a single `project.owner`, so
    // we can match it against every linked wallet without an on-chain call.
    // There is no equivalent indexer field for admins — admin authority is
    // resolved on-chain across the candidate wallets below.
    const isOwnerByApiAddress =
      !!project?.owner && !!user && compareAllWallets(user, project.owner);

    if (!projectInstance) {
      return {
        isProjectOwner: isOwnerByApiAddress,
        isProjectAdmin: false,
      };
    }

    try {
      const rpcUrl = getRPCUrlByChainId(projectInstance.chainID);
      if (!rpcUrl) {
        return {
          isProjectOwner: isOwnerByApiAddress,
          isProjectAdmin: false,
        };
      }
      const { ethers } = await import("ethers");
      const rpcProvider = new ethers.JsonRpcProvider(rpcUrl);

      // Resolve owner/admin across EVERY candidate wallet, in parallel. A role
      // held by a non-active linked wallet still grants access.
      const perWalletResults = await Promise.all(
        candidateAddresses.map(async (candidate) => {
          const [isOwnerResult, isAdminResult] = await Promise.all([
            projectInstance.isOwner(rpcProvider, candidate).catch((error) => {
              errorManager(
                `Error checking owner permissions for user ${candidate} on project ${projectId}`,
                error
              );
              return false;
            }),
            projectInstance.isAdmin(rpcProvider, candidate).catch((error) => {
              errorManager(
                `Error checking admin permissions for user ${candidate} on project ${projectId}`,
                error
              );
              return false;
            }),
          ]);
          return { isOwnerResult, isAdminResult };
        })
      );

      const isOwnerOnChain = perWalletResults.some((result) => result.isOwnerResult);
      const isAdminOnChain = perWalletResults.some((result) => result.isAdminResult);

      return {
        isProjectOwner: isOwnerOnChain || isOwnerByApiAddress,
        isProjectAdmin: isAdminOnChain,
      };
    } catch (error: unknown) {
      errorManager(`Error checking permissions for user ${address} on project ${projectId}`, error);
      return {
        isProjectOwner: isOwnerByApiAddress,
        isProjectAdmin: false,
      };
    }
  };

  // Normalize chainID to null to prevent query key instability when project loads
  const chainID = project?.chainID ?? null;

  // Memoize query key to ensure stable reference
  const queryKey = useMemo(
    () =>
      QUERY_KEYS.PROJECT.PERMISSIONS({
        walletsKey,
        projectId: projectId ?? null,
        chainID,
        isAuth,
      }),
    [walletsKey, projectId, chainID, isAuth]
  );

  const query = useQuery({
    queryKey,
    queryFn: checkPermissions,
    enabled: !!projectInstance && chainID !== null && !!isAuth && !!walletsKey,
    ...defaultQueryOptions,
    gcTime: 1 * 60 * 1000, // 1 minutes
    // Keep showing the previous owner/admin result while a wallet/auth-driven
    // query-key change refetches for the SAME project (e.g. a newly linked
    // wallet shifts walletsKey), instead of dropping isProjectOwner to false
    // and flickering owner-only controls off. Scoped via the function form:
    // results must never carry across projectId/chainID changes, or project
    // A's owner flag would flash as a placeholder on project B (and leak into
    // the global store via the effect below).
    placeholderData: (previousData: ProjectPermissionsResult | undefined, previousQuery) => {
      const previousKey = previousQuery?.queryKey;
      // Key shape: ["project-permissions", walletsKey, projectId, chainID, isAuth]
      const isSameProject =
        !!previousKey && previousKey[2] === (projectId ?? null) && previousKey[3] === chainID;
      return isSameProject ? previousData : undefined;
    },
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
