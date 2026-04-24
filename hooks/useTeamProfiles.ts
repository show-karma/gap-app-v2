import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { communityAdminsService } from "@/services/community-admins.service";
import { useProjectStore } from "@/store";
import type { TeamProfile } from "@/types/team-profile";
import type { Project as ProjectResponse } from "@/types/v2/project";
import { getContributorProfiles } from "@/utilities/indexer/getContributorProfiles";

export const useTeamProfiles = (project: ProjectResponse | undefined) => {
  const setTeamProfiles = useProjectStore((state) => state.setTeamProfiles);
  const { authenticated } = useAuth();

  const rawAddresses = [
    project?.owner,
    ...(project?.members?.map((member) => member.address).filter(Boolean) || []),
  ].filter(Boolean) as string[];
  const uniqueLowercasedAddresses = Array.from(
    new Set(rawAddresses.map((address) => address.toLowerCase()))
  );

  const query = useQuery<TeamProfile[] | undefined>({
    queryKey: ["contributor-profiles", uniqueLowercasedAddresses, authenticated],
    queryFn: async () => {
      if (!project || uniqueLowercasedAddresses.length === 0) return [];
      const profiles = ((await getContributorProfiles(uniqueLowercasedAddresses)) ||
        []) as TeamProfile[];

      if (!authenticated) return profiles;

      try {
        const authorizedProfiles =
          await communityAdminsService.getUserProfiles(uniqueLowercasedAddresses);
        const publicProfilesByAddress = new Map(
          profiles.map((profile) => [profile.recipient.toLowerCase(), profile] as const)
        );

        return uniqueLowercasedAddresses
          .map((address) => {
            const publicProfile = publicProfilesByAddress.get(address);
            const authorizedProfile = authorizedProfiles.get(address);

            if (publicProfile) {
              if (!authorizedProfile?.email) return publicProfile;

              return {
                ...publicProfile,
                data: {
                  ...publicProfile.data,
                  email: authorizedProfile.email,
                },
              };
            }

            if (!authorizedProfile) return undefined;

            return {
              recipient: authorizedProfile.publicAddress,
              data: {
                name: authorizedProfile.name,
                email: authorizedProfile.email,
              },
            } as TeamProfile;
          })
          .filter((profile): profile is TeamProfile => Boolean(profile));
      } catch {
        return profiles;
      }
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
