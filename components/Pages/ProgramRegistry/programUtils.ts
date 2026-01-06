import { registryHelper } from "./helper";
import type { GrantProgram } from "./ProgramList";

/**
 * Extract MongoDB _id as string - handles both V2 API (string) and legacy ({ $oid: string }) formats
 */
function getMongoId(program: GrantProgram): string {
  if (typeof program._id === "string") {
    return program._id;
  }
  return program._id.$oid;
}

/**
 * Parse programId_chainID format from URL (e.g., "1018_10" → { programId: "1018", chainId: 10 })
 * Falls back to default chainId if parsing fails
 * @param id - The program ID string, potentially in format "programId_chainID"
 * @param defaultChainId - Default chain ID to use if parsing fails
 * @returns Object with parsed programId and chainId
 */
export const parseProgramIdAndChainId = (
  id: string,
  defaultChainId: number = registryHelper.supportedNetworks
): { programId: string; chainId: number } => {
  if (!id || !id.includes("_")) {
    return {
      programId: id,
      chainId: defaultChainId,
    };
  }

  const parts = id.split("_");
  if (parts.length === 2 && parts[0]?.trim() && parts[1]?.trim()) {
    const parsedProgramId = parts[0].trim();
    const parsedChainId = parseInt(parts[1].trim(), 10);

    if (parsedProgramId && !Number.isNaN(parsedChainId)) {
      return {
        programId: parsedProgramId,
        chainId: parsedChainId,
      };
    }
  }

  // Fallback to default if parsing fails
  return {
    programId: id,
    chainId: defaultChainId,
  };
};

/**
 * Get the URL-friendly program ID for a GrantProgram
 * Priority: refToGrant > programId_chainID format > programId > _id.$oid
 * @param program - The GrantProgram object
 * @returns The program ID string to use in URLs
 */
export const getProgramIdForUrl = (program: GrantProgram): string => {
  // Check for refToGrant property (if it exists)
  if (program.refToGrant) {
    return program.refToGrant;
  }

  // Use programId_chainID format if both are available
  if (program.programId && program.chainID !== undefined) {
    return `${program.programId}_${program.chainID}`;
  }

  // Fallback to programId or MongoDB _id
  return program.programId || getMongoId(program) || "";
};

/**
 * Normalize grantTypes to always be an array
 * Some API responses return grantTypes as a string instead of an array
 * @param program - The GrantProgram object to normalize
 * @returns The program with normalized grantTypes
 */
export const normalizeGrantTypes = (program: GrantProgram): GrantProgram => {
  if (program.metadata?.grantTypes && typeof program.metadata.grantTypes === "string") {
    return {
      ...program,
      metadata: {
        ...program.metadata,
        grantTypes: [program.metadata.grantTypes],
      },
    };
  }
  return program;
};

/**
 * Normalize grantTypes for an array of programs
 * @param programs - Array of GrantProgram objects to normalize
 * @returns Array of programs with normalized grantTypes
 */
export const normalizeGrantTypesArray = (programs: GrantProgram[]): GrantProgram[] => {
  return programs.map(normalizeGrantTypes);
};
