/**
 * Hook for checking staff authorization status
 *
 * This hook checks if the current user is a staff member. It uses aggressive
 * caching to prevent excessive API calls since staff status rarely changes
 * during a session.
 */
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import fetchData from "@/utilities/fetchData";
import { useAuth } from "./useAuth";

const STAFF_STALE_TIME = 1000 * 60 * 60 * 24; // 24 hours - staff status rarely changes
const STAFF_GC_TIME = 1000 * 60 * 60 * 24; // 24 hours - match staleTime for consistent caching

export const useStaff = () => {
  const { address } = useAccount();
  const { authenticated: isAuth } = useAuth();

  const { data, isLoading, error } = useQuery({
    // Only use address in query key - isAuth is used for `enabled` condition
    // This prevents refetches during Privy hydration when isAuth transitions
    queryKey: ["staffAuthorization", address?.toLowerCase()],
    queryFn: async () => {
      const [data, error] = await fetchData("/auth/staff/authorized");

      if (error) {
        throw new Error(error || "Failed to check staff authorization");
      }

      return data;
    },
    enabled: !!address && isAuth,
    staleTime: STAFF_STALE_TIME,
    gcTime: STAFF_GC_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch when component mounts if data exists
    refetchOnReconnect: false,
    retry: 1,
  });

  const isStaff: boolean = data?.authorized ?? false;

  return { isStaff, isLoading, error };
};
