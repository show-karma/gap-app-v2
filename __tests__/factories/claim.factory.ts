import { applyOverrides, type DeepPartial, randomAddress, seq } from "./utils";

// ─── Lightweight claim-related types (no external imports needed) ───

export interface MockEligibility {
  eligible: boolean;
  proof: string[];
  amount: string;
  claimFee: string;
  tokenSymbol: string;
  tokenDecimals: number;
  reason?: string;
}

export interface MockCampaign {
  campaignId: string;
  networkName: string;
  chainId: number;
  contractAddress: string;
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  totalAllocation: string;
  claimedAmount: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface MockClaimConfig {
  campaignId: string;
  userAddress: string;
  eligibility: MockEligibility;
  campaign: MockCampaign;
}

// ─── Eligibility factory ───

export function createMockEligibility(overrides?: DeepPartial<MockEligibility>): MockEligibility {
  const defaults: MockEligibility = {
    eligible: true,
    proof: [
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    ],
    amount: "1000000000", // 1000 USDC (6 decimals)
    claimFee: "0",
    tokenSymbol: "USDC",
    tokenDecimals: 6,
  };
  return applyOverrides(defaults, overrides);
}

// ─── Campaign factory ───

export function createMockCampaign(overrides?: DeepPartial<MockCampaign>): MockCampaign {
  const n = seq();
  const defaults: MockCampaign = {
    campaignId: `campaign-${n}`,
    networkName: "Optimism",
    chainId: 10,
    contractAddress: randomAddress(),
    tokenAddress: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    tokenSymbol: "USDC",
    tokenDecimals: 6,
    totalAllocation: "500000000000", // 500,000 USDC
    claimedAmount: "125000000000", // 125,000 USDC
    startDate: "2024-06-01T00:00:00Z",
    endDate: "2024-12-31T23:59:59Z",
    isActive: true,
  };
  return applyOverrides(defaults, overrides);
}

// ─── Claim config factory ───

export function createMockClaimConfig(overrides?: DeepPartial<MockClaimConfig>): MockClaimConfig {
  const defaults: MockClaimConfig = {
    campaignId: `campaign-${seq()}`,
    userAddress: randomAddress(),
    eligibility: createMockEligibility(),
    campaign: createMockCampaign(),
  };
  return applyOverrides(defaults, overrides);
}
