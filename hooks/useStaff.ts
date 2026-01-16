/**
 * Hook for checking staff authorization status
 *
 * This hook checks if the current user is a staff member. It uses aggressive
 * caching to prevent excessive API calls since staff status rarely changes
 * during a session.
 */
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { STAFF_CACHE_CONFIG } from "@/utilities/cache-config";
import fetchData from "@/utilities/fetchData";
import { QUERY_KEYS } from "@/utilities/queryKeys";
import { useAuth } from "./useAuth";

export const useStaff = () => {
  const { address } = useAccount();
  const { authenticated: isAuth } = useAuth();

  const { data, isLoading, error } = useQuery({
    // Only use address in query key - isAuth is used for `enabled` condition
    // This prevents refetches during Privy hydration when isAuth transitions
    queryKey: QUERY_KEYS.AUTH.STAFF_AUTHORIZATION(address),
    queryFn: async () => {
      const [data, error] = await fetchData("/auth/staff/authorized");

      if (error) {
        throw new Error(error || "Failed to check staff authorization");
      }

      return data;
    },
    enabled: !!address && isAuth,
    staleTime: STAFF_CACHE_CONFIG.staleTime,
    gcTime: STAFF_CACHE_CONFIG.gcTime,
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch when component mounts if data exists
    refetchOnReconnect: false,
    retry: 1,
  });

  // Return false immediately if not authenticated (defense-in-depth)
  const isStaff: boolean = isAuth ? (data?.authorized ?? false) : false;

  return { isStaff, isLoading, error };
};
