import { useQuery } from "@tanstack/react-query";
import { getContributorProfiles } from "@/utilities/indexer/getContributorProfiles";
import { ContributorProfile } from "@show-karma/karma-gap-sdk";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useProjectStore } from "@/src/features/projects/lib/store";
import { useEffect } from "react";

export const useTeamProfiles = (project: IProjectResponse | undefined) => {
  const setTeamProfiles = useProjectStore((state) => state.setTeamProfiles);

  const rawAddresses =
    project?.members?.map((member) => member.recipient) || [];
  const uniqueLowercasedAddresses = Array.from(
    new Set(rawAddresses.map((address) => address.toLowerCase()))
  );

  const query = useQuery<ContributorProfile[] | undefined>({
    queryKey: ["contributor-profiles", uniqueLowercasedAddresses],
    queryFn: async () => {
      if (!project || uniqueLowercasedAddresses.length === 0) return [];
      const profiles =
        (await getContributorProfiles(uniqueLowercasedAddresses)) || [];
      return profiles;
    },
    enabled: uniqueLowercasedAddresses.length > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  useEffect(() => {
    if (query.data) {
      setTeamProfiles(query.data);
    }
  }, [query.data, setTeamProfiles]);

  return {
    // Team profiles data
    teamProfiles: query.data,

    // Loading states
    isLoading: query.isLoading,
    isFetching: query.isFetching,

    // Error handling
    error: query.error,
    isError: query.isError,

    // Actions
    refetch: query.refetch,

    // Query state
    isSuccess: query.isSuccess,
  };
};
