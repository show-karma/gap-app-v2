import { errorManager } from "@/components/Utilities/errorManager";
import type { FundingProgram } from "@/services/fundingPlatformService";

/**
 * Program Status Types and Interfaces
 * Aligned with gap-whitelabel-app rules for consistency
 */
export type ProgramStatusType = "open" | "closed" | "coming-soon" | "deadline-passed";

export type ProgramStatusColor = "success" | "danger" | "warning" | "default" | "primary";

export interface ProgramStatusInfo {
  status: ProgramStatusType;
  label: string;
  color: ProgramStatusColor;
  dotColor: string;
  endsSoon: boolean;
}

const statusConfig: Record<ProgramStatusType, Omit<ProgramStatusInfo, "status" | "endsSoon">> = {
  open: {
    label: "Open for Applications",
    color: "success",
    dotColor: "bg-green-600",
  },
  closed: {
    label: "Applications Closed",
    color: "default",
    dotColor: "bg-gray-600",
  },
  "coming-soon": {
    label: "Coming Soon",
    color: "primary",
    dotColor: "bg-blue-600",
  },
  "deadline-passed": {
    label: "Deadline Passed",
    color: "warning",
    dotColor: "bg-amber-600",
  },
};

/**
 * Check if a program is within its open date range
 * @param startsAt - Program start date
 * @param endsAt - Program end date
 * @returns true if current date is within the date range
 */
export function isProgramOpen(startsAt: string | undefined, endsAt: string | undefined): boolean {
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
export function isProgramEnabled(program: FundingProgram): boolean {
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
 * Get the display status information for a funding program.
 * Returns status type, label, color, dot color, and endsSoon flag for UI display.
 * Rules aligned with gap-whitelabel-app for consistency across apps.
 */
export function getProgramStatusInfo(program: FundingProgram): ProgramStatusInfo {
  const isEnabled = program.applicationConfig?.isEnabled ?? false;
  const hasFormConfig = !!program.applicationConfig?.formSchema;
  const isApplicationDeadlinePassed = program.metadata?.endsAt
    ? new Date(program.metadata.endsAt) < new Date()
    : false;

  const isOpen =
    program.metadata?.startsAt && program.metadata?.endsAt
      ? isProgramOpen(program.metadata?.startsAt, program.metadata?.endsAt)
      : true;

  let status: ProgramStatusType;
  let endsSoon = false;

  if (!hasFormConfig || !isEnabled) {
    status = "closed";
  } else if (isApplicationDeadlinePassed) {
    status = "deadline-passed";
  } else if (!isOpen) {
    if (program.metadata?.startsAt && new Date(program.metadata.startsAt) > new Date()) {
      status = "coming-soon";
    } else {
      status = "closed";
    }
  } else {
    status = "open";
    const endsAt = program.metadata?.endsAt;
    if (endsAt) {
      const daysUntilEnd = Math.ceil(
        (new Date(endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilEnd <= 7 && daysUntilEnd > 0) {
        endsSoon = true;
      }
    }
  }

  return {
    status,
    endsSoon,
    ...statusConfig[status],
  };
}

/**
 * Constants for funding program detection across the application
 */

export const FUNDING_PROGRAM_COMMUNITIES = ["celo", "gooddollar", "divvi"] as const;

export const FUNDING_PROGRAM_GRANT_NAMES = [
  "Proof of",
  "Hackathon",
  "Divvi Builder Camp",
  "Celo Support Streams",
  "GoodDollar",
  "Cel'Eu Cirkvit",
] as const;

export type FundingProgramCommunity = (typeof FUNDING_PROGRAM_COMMUNITIES)[number];
export type FundingProgramGrantName = (typeof FUNDING_PROGRAM_GRANT_NAMES)[number];

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
export const isFundingProgramGrantName = (grantName?: string): boolean => {
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

/**
 * Get funding program display name
 * @param communityName - The community name
 * @returns Formatted display name for the funding program
 */
export const getFundingProgramDisplayName = (communityName: string): string => {
  const normalized = communityName.toLowerCase();

  if (normalized.includes("celo")) return "Celo";
  if (normalized.includes("gooddollar")) return "GoodDollar";
  if (normalized.includes("divvi")) return "Divvi";

  return communityName;
};

/**
 * Transform and filter enabled funding programs
 * Shared utility for both client and server-side usage
 *
 * Uses isProgramEnabled for filtering, which checks:
 * - isEnabled flag is true
 * - formSchema is configured
 * - Current date is within startsAt/endsAt range
 * - Application deadline has not passed
 */
export function transformLiveFundingOpportunities(programs: any[]): FundingProgram[] {
  try {
    if (!Array.isArray(programs)) {
      throw new Error("Expected programs to be an array");
    }

    // Transform to FundingProgram[] - backend returns full program objects
    const transformedPrograms = programs.map((program: any, index: number): FundingProgram => {
      if (!program || typeof program !== "object") {
        throw new Error(
          `Invalid program data at index ${index}: expected object, got ${typeof program}`
        );
      }
      return program as FundingProgram;
    });

    // Filter to only include programs that are open for applications
    // Uses isProgramEnabled which applies the same rules as gap-whitelabel-app
    const validPrograms = transformedPrograms.filter(
      (program) => (program.metadata?.title || program.name) && isProgramEnabled(program)
    );

    // Sort by startsAt date (most recent first)
    const sortedPrograms = validPrograms.sort((a, b) => {
      const aStartsAt = a.metadata?.startsAt;
      const bStartsAt = b.metadata?.startsAt;
      if (!aStartsAt && !bStartsAt) return 0;
      if (!aStartsAt) return 1;
      if (!bStartsAt) return -1;

      try {
        return new Date(bStartsAt).getTime() - new Date(aStartsAt).getTime();
      } catch (dateError) {
        errorManager(`Invalid date format in funding program: ${dateError}`, dateError, {
          programA: a.metadata?.title || a.name,
          programB: b.metadata?.title || b.name,
        });
        return 0;
      }
    });

    return sortedPrograms;
  } catch (error) {
    errorManager(`Error transforming funding opportunities: ${error}`, error, {
      context: "transformLiveFundingOpportunities",
      programsCount: programs?.length,
    });
    throw error;
  }
}
