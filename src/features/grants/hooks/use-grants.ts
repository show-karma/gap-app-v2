import { errorManager } from "@/lib/utils/error-manager";
import { reduceText } from "@/utilities/reduceText";
import { getGrants, GrantsFilter } from "@/utilities/sdk/communities/getGrants";
import { useQuery } from "@tanstack/react-query";
import { Hex } from "viem";

export type SimplifiedGrant = {
  grant: string;
  project: string;
  description: string;
  createdOn: string;
  categories: string[];
  grantChainId: number;
  uid: string;
  projectUid: string;
  projectSlug: string;
  projectChainId: number;
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

const useGrants = (communityId: string, options?: UseGrantsOptions) => {
  return useQuery<UseGrantsResult>({
    queryKey: ["all-grants", communityId, options?.filter, options?.paginationOps, options?.sortBy],
    queryFn: async () => {
      try {
        const { grants: fetchedGrants, pageInfo } = await getGrants(
          communityId as Hex,
          { ...options?.filter, sortBy: options?.sortBy as any },
          options?.paginationOps
        );
        if (fetchedGrants) {
          const grants = fetchedGrants.map((grant) => ({
            grant: grant.details?.data?.title || grant.uid || "",
            project: grant.project?.details?.data?.title || "",
            description: reduceText(grant.details?.data?.description || ""),
            categories: grant.categories || [],
            uid: grant.uid,
            projectUid: grant.project?.uid || "",
            projectSlug: grant.project?.details?.data?.slug || "",
            createdOn: grant.createdAt || "",
            programId: grant.details?.data?.programId || "",
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

export default useGrants;
