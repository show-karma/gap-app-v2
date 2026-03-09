import { registryHelper } from "@/components/Pages/ProgramRegistry/helper";
import type { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import type { ProgramFormData } from "../schemas/public-form";

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
 * Parse programId_chainID format from URL (e.g., "1018_10" -> { programId: "1018", chainId: 10 })
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
 * Build a composite key from programId and chainID for use in dropdowns/selectors.
 * Returns "programId_chainID" for on-chain programs or just "programId" for off-chain (null chainID).
 */
export const buildCompositeProgramId = (
  programId: string | undefined,
  chainID: number | null | undefined
): string => {
  const id = programId ?? "";
  return chainID != null ? `${id}_${chainID}` : id;
};

/**
 * Parse a composite key back into programId and chainID.
 * Inverse of buildCompositeProgramId — returns null chainID for off-chain programs.
 */
export const parseCompositeProgramKey = (
  value: string
): { programId: string; chainID: number | null } => {
  const lastUnderscore = value.lastIndexOf("_");
  if (lastUnderscore > 0) {
    const chainID = parseInt(value.substring(lastUnderscore + 1), 10);
    if (!Number.isNaN(chainID)) {
      return { programId: value.substring(0, lastUnderscore), chainID };
    }
  }
  return { programId: value, chainID: null };
};

/**
 * Get the URL-friendly program ID for a GrantProgram
 * Priority: refToGrant > programId > _id.$oid
 * Note: No longer appends chainId - URLs should use just programId
 * Backward compatibility for reading URLs with chainId is handled by parseProgramIdAndChainId
 * @param program - The GrantProgram object
 * @returns The program ID string to use in URLs
 */
export const getProgramIdForUrl = (program: GrantProgram): string => {
  // Check for refToGrant property (if it exists)
  if (program.refToGrant) {
    return program.refToGrant;
  }

  // Use just programId (no longer append chainId for cleaner URLs)
  // Backward compatibility when reading is handled by parseProgramIdAndChainId
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

/**
 * Build the base metadata object for a program registry entry.
 * Maps form fields to the metadata shape expected by the indexer API.
 */
export const buildMetadata = (data: ProgramFormData) => ({
  title: data.name,
  description: data.description,
  shortDescription: data.shortDescription || "",
  programBudget: data.budget,
  amountDistributedToDate: data.amountDistributed,
  minGrantSize: data.minGrantSize,
  maxGrantSize: data.maxGrantSize,
  grantsToDate: data.grantsToDate,
  startsAt: data.dates.startsAt,
  endsAt: data.dates.endsAt,
  website: data.website || "",
  projectTwitter: data.twitter || "",
  socialLinks: {
    twitter: data.twitter || "",
    website: data.website || "",
    discord: data.discord || "",
    orgWebsite: data.orgWebsite || "",
    blog: data.blog || "",
    forum: data.forum || "",
    grantsSite: data.grantsSite || "",
    telegram: data.telegram || "",
    facebook: data.facebook || "",
    instagram: data.instagram || "",
  },
  bugBounty: data.bugBounty,
  categories: data.categories,
  ecosystems: data.ecosystems,
  organizations: data.organizations,
  networks: data.networks,
  grantTypes: data.grantTypes,
  platformsUsed: data.platformsUsed,
  logoImg: "",
  bannerImg: "",
  logoImgData: {},
  bannerImgData: {},
  credentials: {},
  anyoneCanJoin: data.anyoneCanJoin,
  type: "program",
  tags: ["karma-gap", "grant-program-registry"],
  communityRef: data.communityRef,
  adminEmails: data.adminEmails,
  financeEmails: data.financeEmails,
});

/**
 * Build type-specific metadata payload from form data.
 * Maps form fields to the API shape expected by the indexer for each opportunity type.
 */
export const buildTypedMetadata = (data: ProgramFormData): Record<string, unknown> => {
  const type = data.opportunityType;
  if (type === "hackathon" && data.hackathonMeta) {
    const m = data.hackathonMeta;
    const tracks = m.tracks
      ? m.tracks
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : undefined;
    return {
      hackathonMetadata: {
        startDate: data.dates.startsAt?.toISOString() ?? "",
        endDate: data.dates.endsAt?.toISOString() ?? "",
        location: m.location || "",
        ...(tracks && tracks.length > 0 ? { tracks } : {}),
        ...(m.prizePool
          ? {
              prizes: [
                {
                  amount: m.prizePool,
                  currency: m.prizeCurrency || "USD",
                },
              ],
            }
          : {}),
        ...(m.registrationDeadline
          ? { registrationDeadline: m.registrationDeadline.toISOString() }
          : {}),
        ...(m.teamSizeMin != null || m.teamSizeMax != null
          ? { teamSize: { min: m.teamSizeMin ?? 1, max: m.teamSizeMax ?? 5 } }
          : {}),
      },
    };
  }
  if (type === "bounty" && data.bountyMeta) {
    const m = data.bountyMeta;
    const skills = m.skills
      ? m.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;
    return {
      bountyMetadata: {
        reward: {
          amount: m.rewardAmount ?? 0,
          currency: m.rewardCurrency || "USD",
        },
        ...(m.difficulty ? { difficulty: m.difficulty } : {}),
        ...(skills && skills.length > 0 ? { skills } : {}),
        ...(m.platform ? { platform: m.platform } : {}),
      },
    };
  }
  if (type === "accelerator" && data.acceleratorMeta) {
    const m = data.acceleratorMeta;
    return {
      acceleratorMetadata: {
        ...(m.stage ? { stage: m.stage } : {}),
        ...(m.equity ? { equity: m.equity } : {}),
        ...(m.fundingAmount
          ? {
              funding: {
                amount: m.fundingAmount,
                currency: m.fundingCurrency || "USD",
              },
            }
          : {}),
        ...(m.programDuration ? { programDuration: m.programDuration } : {}),
        ...(m.batchSize ? { batchSize: m.batchSize } : {}),
        ...(m.location ? { location: m.location } : {}),
        ...(data.deadline ? { applicationDeadline: data.deadline.toISOString() } : {}),
      },
    };
  }
  if (type === "vc_fund" && data.vcFundMeta) {
    const m = data.vcFundMeta;
    const portfolio = m.portfolio
      ? m.portfolio
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean)
      : undefined;
    return {
      vcFundMetadata: {
        ...(m.stage ? { stage: m.stage } : {}),
        ...(m.checkSizeMin != null || m.checkSizeMax != null
          ? {
              checkSize: {
                min: m.checkSizeMin ?? 0,
                max: m.checkSizeMax ?? 0,
                currency: m.checkSizeCurrency || "USD",
              },
            }
          : {}),
        ...(m.thesis ? { thesis: m.thesis } : {}),
        ...(portfolio && portfolio.length > 0 ? { portfolio } : {}),
        ...(m.contactMethod ? { contactMethod: m.contactMethod } : {}),
        ...(m.activelyInvesting !== undefined ? { activelyInvesting: m.activelyInvesting } : {}),
      },
    };
  }
  if (type === "rfp" && data.rfpMeta) {
    const m = data.rfpMeta;
    const requirements = m.requirements
      ? m.requirements
          .split("\n")
          .map((r) => r.trim())
          .filter(Boolean)
      : undefined;
    return {
      rfpMetadata: {
        issuingOrganization: m.issuingOrganization || "",
        ...(m.budgetAmount
          ? {
              budget: {
                amount: m.budgetAmount,
                currency: m.budgetCurrency || "USD",
              },
            }
          : {}),
        ...(m.scope ? { scope: m.scope } : {}),
        ...(requirements && requirements.length > 0 ? { requirements } : {}),
      },
    };
  }
  return {};
};

/**
 * Build top-level fields (type, deadline, submissionUrl, typed metadata) for the API request.
 * Grants don't send these fields; other opportunity types do.
 */
export const buildTopLevelFields = (data: ProgramFormData): Record<string, unknown> => {
  const isGrant = data.opportunityType === "grant";
  return {
    ...(isGrant ? {} : { type: data.opportunityType }),
    ...(!isGrant && data.deadline ? { deadline: data.deadline.toISOString() } : {}),
    ...(!isGrant && data.submissionUrl ? { submissionUrl: data.submissionUrl } : {}),
    ...buildTypedMetadata(data),
  };
};
