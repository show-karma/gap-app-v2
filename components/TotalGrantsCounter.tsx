"use client";

import { getTotalProjects } from "@/utilities/karma/totalProjects";
import { getGrants } from "@/utilities/sdk";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import pluralize from "pluralize";
import { Hex } from "viem";

interface TotalGrantsCounterProps {
  overrideGrantsNo?: string;
  overrideProjectsNo?: string;
}

export const TotalGrantsCounter = (props: TotalGrantsCounterProps) => {
  const { overrideGrantsNo, overrideProjectsNo } = props;
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

  const grants = overrideGrantsNo || fetchedGrants;
  const projects = overrideProjectsNo || totalProjects || 0;
  return (
    <div
      id="total-grants"
      className="text-lg font-semibold text-brand-blue dark:text-brand-blue max-2xl:text-base"
    >
      Total Grants {grants ? `(${grants})` : null}
      {` `}
      {!isLoading
        ? `across ${projects} ${pluralize("projects", projects)}`
        : null}
    </div>
  );
};
