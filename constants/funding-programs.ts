/**
 * Constants for funding program detection across the application
 */

export const FUNDING_PROGRAM_COMMUNITIES = [
  'celo',
  'gooddollar', 
  'divvi'
] as const;

export const FUNDING_PROGRAM_GRANT_NAMES = [
  'Proof of',
  'Hackathon',
  'Divvi Builder Camp',
  'Celo Support Streams',
  'GoodDollar'
] as const;

export type FundingProgramCommunity = typeof FUNDING_PROGRAM_COMMUNITIES[number];
export type FundingProgramGrantName = typeof FUNDING_PROGRAM_GRANT_NAMES[number];

/**
 * Check if a community is a funding program community
 * @param communityName - The community name to check
 * @returns true if the community is a funding program community
 */
export const isFundingProgramCommunity = (communityName?: string): boolean => {
  if (!communityName) return false;
  const normalized = communityName.toLowerCase();
  return FUNDING_PROGRAM_COMMUNITIES.some(fp => normalized.includes(fp));
};

/**
 * Check if a grant name indicates a funding program
 * @param grantName - The grant name to check
 * @returns true if the grant name indicates a funding program
 */
export const isFundingProgramGrantName = (grantName?: string): boolean => {
  if (!grantName) return false;
  // Special handling for "Proof of" - check if it starts with this phrase
  if (grantName.toLowerCase().startsWith('proof of')) return true;
  
  return FUNDING_PROGRAM_GRANT_NAMES.some(fp => {
    if (fp === 'Proof of') return false; // Already handled above
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
  console.log('isCommunityFundingProgram', isCommunityFundingProgram);
  console.log('isGrantFundingProgram', isGrantFundingProgram);
  return isCommunityFundingProgram && isGrantFundingProgram;
};

/**
 * Get funding program display name
 * @param communityName - The community name
 * @returns Formatted display name for the funding program
 */
export const getFundingProgramDisplayName = (communityName: string): string => {
  const normalized = communityName.toLowerCase();
  
  if (normalized.includes('celo')) return 'Celo';
  if (normalized.includes('gooddollar')) return 'GoodDollar';
  if (normalized.includes('divvi')) return 'Divvi';
  
  return communityName;
};