import { useQuery } from "@tanstack/react-query";
import type { FundingProgram } from "@/types/whitelabel-entities";
import fetchData from "@/utilities/fetchData";
import type { UseProgramReturn } from "../types";

export function useProgram(programId: string): UseProgramReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["wl-program", programId],
    queryFn: async () => {
      const [res, err] = await fetchData<FundingProgram>(
        `/v2/funding-program-configs/${programId}`,
        "GET",
        {},
        {},
        {},
        true
      );
      if (err) throw new Error(err);
      return res;
    },
    enabled: !!programId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    program: data || null,
    loading: isLoading,
    error: error as Error | null,
    refetch,
  };
}
