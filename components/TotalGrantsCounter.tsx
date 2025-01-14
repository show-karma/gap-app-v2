"use client";

import { getTotalProjects } from "@/utilities/karma/totalProjects";
import { getGrants } from "@/utilities/sdk";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Hex } from "viem";

export const TotalGrantsCounter = () => {
  const params = useParams();
  const communityId = params.communityId as string;
  const { data: totalProjects, isLoading } = useQuery({
    queryKey: ["totalProjects", communityId],
    queryFn: () => getTotalProjects(communityId),
    enabled: !!communityId,
  });
  const { data: fetchedGrants, isLoading: isLoadingGrants } = useQuery({
    queryKey: ["total-grants", communityId],
    queryFn: () =>
      getGrants(communityId as Hex).then((res) => res.pageInfo.totalItems),
    initialData: 0,
    enabled: !!communityId,
  });
  return (
    <div
      id="total-grants"
      className="text-lg font-semibold text-brand-blue dark:text-brand-blue max-2xl:text-base"
    >
      Total Grants {fetchedGrants ? `(${fetchedGrants})` : null}
      {` `}
      {!isLoading ? `across ${totalProjects || 0} projects` : null}
    </div>
  );
};
