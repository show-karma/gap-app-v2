import type { FundingProgram } from "@/services/fundingPlatformService";
import type { FundingProgramResponse } from "../types/funding-program";

/**
 * Maps a FundingProgram (from homepage/funding platform) to FundingProgramResponse
 * (used by funding map components).
 *
 * This allows reusing FundingMapCard in other contexts like the homepage carousel.
 */
export function mapFundingProgramToResponse(program: FundingProgram): FundingProgramResponse {
  return {
    _id: { $oid: program.programId },
    programId: program.programId,
    chainID: program.chainID,
    metadata: program.metadata,
    // Map community data from FundingProgram to communities array
    communities: program.communityUID
      ? [
          {
            uid: program.communityUID,
            name: program.communityName,
            slug: program.communitySlug,
            imageUrl: program.communityImage,
          },
        ]
      : [],
    // Programs from the funding platform API are considered "on Karma"
    isOnKarma: true,
    isValid: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
