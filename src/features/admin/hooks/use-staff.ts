import { fetchData } from "@/lib/utils/fetch-data";
import { defaultQueryOptions } from "@/config/query";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";

export const useStaff = () => {
  const { address } = useAccount();

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
