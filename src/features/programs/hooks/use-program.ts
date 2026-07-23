import { useQuery } from "@tanstack/react-query";
import type { FundingProgram } from "@/types/whitelabel-entities";
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";
import type { UseProgramReturn } from "../types";

export function useProgram(programId: string): UseProgramReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["wl-program", programId],
    queryFn: async () => {
      // TODO(#1775): add zod schema
      try {
        return await api.get<FundingProgram>(`/v2/funding-program-configs/${programId}`);
      } catch (err) {
        // A missing program is an expected "not found" outcome, not a
        // failure — resolve to null so the component renders its
        // not-found empty state instead of the generic error state.
        if (err instanceof HttpError && err.status === 404) {
          return null;
        }
        throw err;
      }
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
