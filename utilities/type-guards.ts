import type { IFundingProgramConfig, ProgramWithFormSchema } from "@/types/funding-platform";

/**
 * Type guard to check if a program has a valid IFundingProgramConfig structure
 * @param program - The program to check
 * @returns True if program is a valid IFundingProgramConfig, false otherwise
 */
export function isFundingProgramConfig(
  program: ProgramWithFormSchema | undefined | null
): program is IFundingProgramConfig {
  if (!program) return false;
  
  // Check for required IFundingProgramConfig properties
  return (
    typeof program === 'object' &&
    'id' in program &&
    'programId' in program &&
    'chainID' in program &&
    'formSchema' in program &&
    typeof program.formSchema === 'object' &&
    program.formSchema !== null &&
    'fields' in program.formSchema
  );
}

