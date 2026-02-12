import { useQuery } from "@tanstack/react-query";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { QUERY_KEYS } from "@/utilities/queryKeys";

export interface UserProfile {
  email: string;
  name: string;
}

export type UserProfileMap = Record<string, UserProfile>;

export const useUserProfiles = (addresses: string[]) => {
  const uniqueLowercased = Array.from(
    new Set(addresses.filter(Boolean).map((a) => a.toLowerCase()))
  );

  const query = useQuery<UserProfileMap>({
    queryKey: QUERY_KEYS.USERS.PROFILES_BATCH(uniqueLowercased),
    queryFn: async () => {
      if (uniqueLowercased.length === 0) return {};
      const [data, error] = await fetchData(INDEXER.V2.USERS.PROFILES_BATCH, "POST", {
        addresses: uniqueLowercased,
      });
      if (error || !data) return {};
      return data.profiles;
    },
    enabled: uniqueLowercased.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    isError: query.isError,
    refetch: query.refetch,
    isSuccess: query.isSuccess,
  };
};
