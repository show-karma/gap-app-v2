import { useQuery } from "@tanstack/react-query";
import fetchData from "@/utilities/fetchData";
import type { FundingProgram, FundingProgramConfig } from "@/types/whitelabel-entities";

export interface ProgramWithConfig {
  programId: string;
  chainID: number;
  name: string;
  description?: string;
  applicationConfig?: FundingProgramConfig | null;
}

interface UseProgramsWithConfigReturn {
  programs: ProgramWithConfig[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useProgramsWithConfig(
  communityId: string,
): UseProgramsWithConfigReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["wl-programs-with-config", communityId],
    queryFn: async () => {
      const [res, err] = await fetchData<FundingProgram[]>(
        `/v2/funding-program-configs/community/${communityId}?status=active&limit=100`,
        "GET",
        {},
        {},
        {},
        true,
      );
      if (err) throw new Error(err);
      const programs = res || [];

      const programsWithConfig = programs.filter(
        (program) => program.applicationConfig?.formSchema,
      );

      return programsWithConfig.map((program) => ({
        programId: program.programId,
        chainID: program.chainID,
        name:
          program.name ||
          program.metadata?.title ||
          `Program ${program.programId}`,
        description: program.metadata?.description,
        applicationConfig: program.applicationConfig,
      }));
    },
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });

  return {
    programs: data || [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
