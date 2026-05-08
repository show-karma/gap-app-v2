import type { FundingProgram, FundingProgramConfig } from "@/types/whitelabel-entities";
import { useProgramsList } from "./use-programs-list";

export interface ProgramWithConfig {
  programId: string;
  chainID: number;
  name: string;
  description?: string;
  applicationConfig?: FundingProgramConfig | null;
  metrics?: FundingProgram["metrics"];
}

interface UseProgramsWithConfigReturn {
  programs: ProgramWithConfig[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useProgramsWithConfig(communityId: string): UseProgramsWithConfigReturn {
  const { data, isLoading, error, refetch } = useProgramsList(communityId);

  const programs = (data ?? [])
    .filter((program) => program.applicationConfig?.formSchema)
    .map((program) => ({
      programId: program.programId,
      chainID: program.chainID,
      name: program.name || program.metadata?.title || `Program ${program.programId}`,
      description: program.metadata?.description,
      applicationConfig: program.applicationConfig,
      metrics: program.metrics,
    }));

  return {
    programs,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
