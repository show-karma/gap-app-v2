import { useQuery } from "@tanstack/react-query";
import type { Hex } from "viem";
import { errorManager } from "@/components/Utilities/errorManager";
import type { Grant } from "@/types/v2/grant";
import { reduceText } from "@/utilities/reduceText";
import { type GrantsFilter, getGrants } from "@/utilities/sdk/communities/getGrants";

export type SimplifiedGrant = {
  grant: string;
  project: string;
  description: string;
  createdOn: string;
  categories: string[];
  regions: string[];
  grantChainId: number;
  uid: string;
  projectUid: string;
  projectSlug: string;
  projectChainId?: number;
  programId: string;
  payoutAddress?: string;
  payoutAmount?: string;
};

interface UseGrantsOptions {
  filter?: GrantsFilter;
  paginationOps?: {
    page: number;
    pageLimit: number;
  };
  sortBy?: string;
}

interface UseGrantsResult {
  grants: SimplifiedGrant[];
  totalItems: number;
}

export const useGrants = (communityId: string, options?: UseGrantsOptions) => {
  return useQuery<UseGrantsResult>({
    queryKey: ["all-grants", communityId, options?.filter, options?.paginationOps, options?.sortBy],
    queryFn: async () => {
      try {
        const { grants: fetchedGrants, pageInfo } = await getGrants(
          communityId as Hex,
          { ...options?.filter, sortBy: options?.sortBy as GrantsFilter["sortBy"] },
          options?.paginationOps
        );
        if (fetchedGrants) {
          const grants = (fetchedGrants as unknown as Grant[]).map((grant) => ({
            grant: grant.details?.title || grant.uid || "",
            project: grant.project?.details?.title || "",
            description: reduceText(grant.details?.description || ""),
            categories: grant.categories || [],
            regions: grant.regions || [],
            uid: grant.uid,
            projectUid: grant.project?.uid || "",
            projectSlug: grant.project?.details?.slug || "",
            createdOn: grant.createdAt || "",
            programId: grant.details?.programId || "",
            chainId: grant.chainID,
            payoutAddress: grant.project?.payoutAddress,
            payoutAmount: grant.amount,
            grantChainId: grant.chainID,
            projectChainId: grant.project?.chainID,
          }));
          return {
            grants,
            totalItems: pageInfo?.totalItems || 0,
          };
        }
        return { grants: [], totalItems: 0 };
      } catch (error: any) {
        errorManager(`Error fetching grants of ${communityId}`, error, {
          communityUID: communityId,
        });
        return { grants: [], totalItems: 0 };
      }
    },
    enabled: !!communityId && communityId !== "0x0",
  });
};
