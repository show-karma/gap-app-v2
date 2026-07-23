/** Minimal structural type accepted by program-check utilities — satisfied by both FundingProgram variants. */
interface ProgramLike {
  applicationConfig?: { isEnabled?: boolean; formSchema?: unknown } | null;
  metadata?: { endsAt?: string; startsAt?: string; title?: string };
  name?: string;
}

/**
 * Check if a program is within its open date range
 * @param startsAt - Program start date
 * @param endsAt - Program end date
 * @returns true if current date is within the date range
 */
function isProgramOpen(startsAt: string | undefined, endsAt: string | undefined): boolean {
  if (!startsAt || !endsAt) return true;

  const now = new Date();
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  return now >= start && now <= end;
}

/**
 * Check if a program is enabled and accepting applications
 * This is the source of truth for determining if users can apply to a program.
 * Rules aligned with gap-whitelabel-app for consistency across apps.
 *
 * @param program - The funding program to check
 * @returns true if the program is accepting applications
 */
export function isProgramEnabled(program: ProgramLike): boolean {
  const isEnabled = program.applicationConfig?.isEnabled ?? false;
  const hasFormConfig = !!program.applicationConfig?.formSchema;
  const isApplicationDeadlinePassed = program.metadata?.endsAt
    ? new Date(program.metadata.endsAt) < new Date()
    : false;

  const isOpen =
    program.metadata?.startsAt && program.metadata?.endsAt
      ? isProgramOpen(program.metadata?.startsAt, program.metadata?.endsAt)
      : true;

  return hasFormConfig && isEnabled && isOpen && !isApplicationDeadlinePassed;
}

/**
 * Constants for funding program detection across the application
 */

const FUNDING_PROGRAM_COMMUNITIES = ["celo", "gooddollar", "divvi"] as const;

export const FUNDING_PROGRAM_GRANT_NAMES = [
  "Proof of",
  "Hackathon",
  "Divvi Builder Camp",
  "Celo Support Streams",
  "GoodDollar",
  "Cel'Eu Cirkvit",
] as const;

/**
 * Check if a community is a funding program community
 * @param communityName - The community name to check
 * @returns true if the community is a funding program community
 */
export const isFundingProgramCommunity = (communityName?: string): boolean => {
  if (!communityName) return false;
  const normalized = communityName.toLowerCase();
  return FUNDING_PROGRAM_COMMUNITIES.some((fp) => normalized.includes(fp));
};

/**
 * Check if a grant name indicates a funding program
 * @param grantName - The grant name to check
 * @returns true if the grant name indicates a funding program
 */
const isFundingProgramGrantName = (grantName?: string): boolean => {
  if (!grantName) return false;
  // Special handling for "Proof of" - check if it starts with this phrase
  if (grantName.toLowerCase().startsWith("proof of")) return true;

  return FUNDING_PROGRAM_GRANT_NAMES.some((fp) => {
    if (fp === "Proof of") return false; // Already handled above
    return grantName.toLowerCase().includes(fp.toLowerCase());
  });
};

/**
 * Check if a grant is from a funding program (by community or grant name)
 * @param communityName - The community name to check
 * @param grantName - The grant name to check
 * @returns true if either the community or grant name indicates a funding program
 */
export const isFundingProgramGrant = (communityName?: string, grantName?: string): boolean => {
  const isCommunityFundingProgram = isFundingProgramCommunity(communityName);
  const isGrantFundingProgram = isFundingProgramGrantName(grantName);
  return isCommunityFundingProgram && isGrantFundingProgram;
};
