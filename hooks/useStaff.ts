import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import fetchData from "@/utilities/fetchData";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";
import { useAuth } from "./useAuth";

export const useStaff = () => {
  const { address } = useAccount();
  const { authenticated: isAuth } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["staffAuthorization", address, isAuth],
    queryFn: async () => {
      if (!address || !isAuth) return { authorized: false };

      const [data, error] = await fetchData("/auth/staff/authorized");

      if (error) {
        throw new Error(error || "Failed to check staff authorization");
      }

      return data;
    },
    enabled: !!address && isAuth,
    ...defaultQueryOptions,
  });

  const isStaff: boolean = data?.authorized ?? false;

  return { isStaff, isLoading, error };
};
