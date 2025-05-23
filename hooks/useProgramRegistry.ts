import { useQuery } from "@tanstack/react-query";
import { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

// Query keys for program registry
export const PROGRAM_REGISTRY_QUERY_KEYS = {
  all: ["program-registry"] as const,
  byId: (programId: string, chainId: number) =>
    [...PROGRAM_REGISTRY_QUERY_KEYS.all, "by-id", programId, chainId] as const,
};

/**
 * Hook to fetch a program from the registry by ID and chain ID
 * Returns a single program or array of programs depending on API response
 */
export const useProgramRegistry = (programId: string, chainId: number) => {
  return useQuery({
    queryKey: PROGRAM_REGISTRY_QUERY_KEYS.byId(programId, chainId),
    queryFn: async (): Promise<GrantProgram | GrantProgram[]> => {
      const [result, error] = await fetchData(
        INDEXER.REGISTRY.FIND_BY_ID(programId, chainId)
      );

      if (error) {
        throw new Error(error);
      }

      if (!result) {
        throw new Error("Program not found");
      }

      // Handle the case where the API returns a single program or array
      const programs = Array.isArray(result) ? result : [result];

      // Process grant types that might be strings
      programs.forEach((program: GrantProgram) => {
        if (typeof program.metadata?.grantTypes === "string") {
          program.metadata.grantTypes = [program.metadata.grantTypes];
        }
      });

      // Return single program or array based on original response format
      return Array.isArray(result) ? programs : programs[0];
    },
    enabled: !!programId && !!chainId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
