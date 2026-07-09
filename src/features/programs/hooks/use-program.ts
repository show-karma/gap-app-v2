import { useQuery } from "@tanstack/react-query";
import type { FundingProgram } from "@/types/whitelabel-entities";
import { api } from "@/utilities/api/client";
import type { UseProgramReturn } from "../types";

export function useProgram(programId: string): UseProgramReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["wl-program", programId],
    // TODO(#1775): add zod schema
    queryFn: () => api.get<FundingProgram>(`/v2/funding-program-configs/${programId}`),
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
