import { Address } from "viem";

// EAS contracts
export const ARB_ONE_EAS = "0xbD75f629A22Dc1ceD33dDA0b68c546A1c035c458";
export const ARB_ONE_SCHEMA_REGISTRY = "0xA310da9c5B885E7fb3fbA9D66E9Ba6Df512b78eB";

// The schema UID for EAS
export const KARMA_EAS_SCHEMA_UID =
  "0x7cf7c9d2dcff65ed9d3271c4b15efbe76a42bf36049f15ccf2b8153c89cc1366";
// The Karma-Gap scorer ID constant
export const SCORER_ID = 1;
// The Karma-Gap scorer decimals amount
export const SCORER_DECIMALS = 18;

// The Trustful-Karma contracts
export const GRANT_REGISTRY = "0x2E6De0735b896dD248B08dcb9BA1f1f6Dd5bf1B7";
export const BADGE_REGISTRY = "0x95d4123c5fA150B04dD56b0ab5141DEcB41725b0";
export const TRUSTFUL_SCORER = "0xa402A493780AA7C40468336f6A5Afea5814891bF";
export const RESOLVER_EAS = "0xbAc1B69837EB8d68294cBDF81acbfE57250264CF";
export const RESOLVER_TRUSTFUL = "0x12Fe1E060B0B1c4Efc6d7A8dC9394ffC53842b78";

export const RAILWAY_BACKEND = "https://trustful-karma-gap-backend-staging.up.railway.app";

/** Pre-review form interfaces to connect form to the API. */
export interface PreReviewAnswers {
  category: CategoryOptions;
  otherCategoryDescriptions?: string;
  receivedGrant: ReceivedGrantOptions;
}

export interface CreatePreReviewRequest {
  preReviewAnswers: PreReviewAnswers;
  connectedUserAddress: Address;
  grantId: string;
  programId?: string;
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
