import { useQuery } from "@tanstack/react-query";
import { wlQueryKeys } from "@/src/lib/query-keys";
import type { FundingProgram } from "@/types/whitelabel-entities";
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";
import { publicReadOptions } from "@/utilities/api/public-read";
import { INDEXER } from "@/utilities/indexer";
import { PRERENDER_SAFE_STALE_TIME } from "@/utilities/queries/prerenderStaleTime";
import type { UseProgramReturn } from "../types";

/**
 * Shared with the server prefetch in `programs/[programId]/page.tsx`. The
 * hydrated cache entry is only considered fresh — and therefore not refetched
 * on mount — while both sides agree on this window.
 */
export const PROGRAM_DETAIL_STALE_TIME = 5 * 60 * 1000;

export function useProgram(
  programId: string,
  options: { prerenderSafe?: boolean } = {}
): UseProgramReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: wlQueryKeys.programs.detail(programId),
    queryFn: async () => {
      // TODO(#1775): add zod schema
      try {
        return await api.get<FundingProgram>(
          INDEXER.V2.FUNDING_PROGRAMS.GET(encodeURIComponent(programId)),
          // Client-only today, so this changes nothing on the client — but it
          // keeps the audit clean: no api read that a cache could ever reach is
          // left on the authorized default.
          publicReadOptions()
        );
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
    // Above crawlable content this must not read the clock; see the constant.
    staleTime: options.prerenderSafe ? PRERENDER_SAFE_STALE_TIME : PROGRAM_DETAIL_STALE_TIME,
  });

  return {
    program: data || null,
    loading: isLoading,
    error: error as Error | null,
    refetch,
  };
}
