import fetchData from "@/utilities/fetchData";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "./useWallet";

export const useStaff = () => {
  const { address } = useWallet();

  const { data, isLoading, error } = useQuery({
    queryKey: ["staffAuthorization", address],
    queryFn: async () => {
      if (!address) return { authorized: false };

      const [data, error] = await fetchData("/auth/staff/authorized");

      if (error) {
        throw new Error(error || "Failed to check staff authorization");
      }

      return data;
    },
    enabled: !!address,
    ...defaultQueryOptions,
  });

  const isStaff = data?.authorized ?? false;

  return { isStaff, isLoading, error };
};
