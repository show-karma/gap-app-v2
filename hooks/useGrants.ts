import { errorManager } from "@/components/Utilities/errorManager";
import { reduceText } from "@/utilities/reduceText";
import { getGrants } from "@/utilities/sdk/communities/getGrants";
import { useQuery } from "@tanstack/react-query";
import { Hex } from "viem";

export type SimplifiedGrant = {
  grant: string;
  project: string;
  description: string;
  createdOn: string;
  categories: string[];
  uid: string;
  projectUid: string;
  projectSlug: string;
  programId: string;
};

export const useGrants = (communityId: string) => {
  return useQuery<SimplifiedGrant[]>({
    queryKey: ["all-grants", communityId],
    queryFn: async () => {
      try {
        const { grants: fetchedGrants } = await getGrants(communityId as Hex);
        if (fetchedGrants) {
          return fetchedGrants.map((grant: any) => ({
            grant: grant.details?.data?.title || grant.uid || "",
            project: grant.project?.details?.data?.title || "",
            description: reduceText(grant.details?.data?.description || ""),
            categories: grant.categories || [],
            uid: grant.uid,
            projectUid: grant.project?.uid || "",
            projectSlug: grant.project?.details?.data?.slug || "",
            createdOn: grant.createdOn || "",
            programId: grant.details?.data?.programId || "",
          }));
        }
        return [];
      } catch (error: any) {
        errorManager(`Error fetching grants of ${communityId}`, error);
        return [];
      }
    },
    enabled: !!communityId && communityId !== "0x0",
  });
};
