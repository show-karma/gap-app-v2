/**
 * Typed model for the public V2 community-programs endpoint
 * (`GET /v2/communities/:uidOrSlug/programs`).
 *
 * Mirrors the PII-safe whitelist DTO from gap-indexer exactly — do NOT widen
 * this to the registry's `FundingProgramResponse`/`GrantProgram`, which carries
 * fields (createdAt, isValid, adminEmails, tags, …) the V2 endpoint no longer
 * returns. Typing this data with the registry type would hide runtime holes.
 *
 * Every field is optional/nullable because the underlying registry documents
 * are inconsistent (off-chain programs have `chainID: null`, most metadata is
 * sparse).
 */

interface CommunityProgramSocialLinks {
  website?: string;
  twitter?: string;
  discord?: string;
  telegram?: string;
  grantsSite?: string;
  orgWebsite?: string;
  blog?: string;
  forum?: string;
}

export interface CommunityProgramMetadata {
  title?: string;
  description?: string;
  shortDescription?: string;
  status?: string;
  type?: string;
  logoImg?: string;
  bannerImg?: string;
  website?: string;
  socialLinks?: CommunityProgramSocialLinks;
  startsAt?: string | number | null;
  endsAt?: string | number | null;
  programBudget?: string | number | null;
  minGrantSize?: string | number | null;
  maxGrantSize?: string | number | null;
  categories?: string[];
  networks?: string[];
  ecosystems?: string[];
  grantTypes?: string[];
  /**
   * When `false`, projects must contact the program manager to join; the
   * grant-creation UI blocks direct selection. Defaults to joinable when
   * absent.
   */
  anyoneCanJoin?: boolean;
}

export interface CommunityProgram {
  programId: string;
  /** `null` for off-chain programs. */
  chainID: number | null;
  name?: string | null;
  metadata: CommunityProgramMetadata;
}
