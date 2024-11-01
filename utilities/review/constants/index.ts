import { Address } from "viem";

// EAS contracts
export const ARB_ONE_EAS = "0xbD75f629A22Dc1ceD33dDA0b68c546A1c035c458";
export const ARB_ONE_SCHEMA_REGISTRY = "0xA310da9c5B885E7fb3fbA9D66E9Ba6Df512b78eB";

// The schema UID for EAS 
export const KARMA_EAS_SCHEMA_UID =
  "0x5b3884b77ebe533e556d6ea74b462a21852e321b4146d3121546e9d17bd974e1";
// The Karma-Gap scorer ID constant
export const SCORER_ID = 1;
// The Karma-Gap scorer decimals amount
export const SCORER_DECIMALS = 18;

// The Trustful-Karma contracts
export const GRANT_REGISTRY = "0x2E6De0735b896dD248B08dcb9BA1f1f6Dd5bf1B7";
export const BADGE_REGISTRY = "0x95d4123c5fA150B04dD56b0ab5141DEcB41725b0";
export const TRUSTFUL_SCORER = "0x73df629ddc79Bec3ecB50c0e6f337cb6D99abd62";
export const RESOLVER_EAS = "0x202CD7Ef0a73cf1C541a40f274B2257580214476";
export const RESOLVER_TRUSTFUL = "0x56f9cbAc701D2C546a15bcB152a4E789f2B4aADF";

export const RAILWAY_BACKEND = "https://trustful-karma-gap-backend-staging.up.railway.app";

/** Pre-review form interfaces to connect form to the API. */
export interface PreReviewAnswers {
  category: CategoryOptions;
  otherCategoryDescriptions?: string;
  receivedGrant: ReceivedGrantOptions;
}

export interface CreatePreReviewRequest {
  preReviewAnswers?: PreReviewAnswers;
  connectedUserAddress: Address;
  grantId: string;
  programId?: string;
  badgesScores: number[];
  activeBadgeIds: string[],
}

export enum CategoryOptions {
  DevTooling = "Dev tooling",
  Education = "Education",
  MarketingAndGrowth = "Marketing and Growth",
  DeFi = "DeFi",
  DAOsAndGovernance = "DAOs and Governance",
  Community = "Community",
  Gaming = "Gaming",
  PublicGoods = "Public Goods",
  ZKAndPrivacy = "ZK and privacy",
  Other = "Other",
}

export enum ReceivedGrantOptions {
  Yes = "Yes, I got approved",
  No = "No",
  Pending = "I don't have the answer yet",
}