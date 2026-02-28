import { parse as uuidParse } from "uuid";
import { toHex } from "viem";

/**
 * ClaimCampaigns contract ABI (only the functions we need)
 */
export const CLAIM_CAMPAIGNS_ABI = [
  {
    name: "claim",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "campaignId", type: "bytes16" },
      { name: "proof", type: "bytes32[]" },
      { name: "claimAmount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "claimWithSig",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "campaignId", type: "bytes16" },
      { name: "proof", type: "bytes32[]" },
      { name: "claimer", type: "address" },
      { name: "claimAmount", type: "uint256" },
      {
        name: "claimSignature",
        type: "tuple",
        components: [
          { name: "nonce", type: "uint256" },
          { name: "expiry", type: "uint256" },
          { name: "v", type: "uint8" },
          { name: "r", type: "bytes32" },
          { name: "s", type: "bytes32" },
        ],
      },
    ],
    outputs: [],
  },
  {
    name: "claimed",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "campaignId", type: "bytes16" },
      { name: "claimer", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "nonces",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "DOMAIN_SEPARATOR",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bytes32" }],
  },
] as const;

/**
 * EIP-712 type hash for claim signatures
 */
export const CLAIM_TYPEHASH =
  "Claim(bytes16 campaignId,address claimer,uint256 claimAmount,uint256 nonce,uint256 expiry)" as const;

/**
 * Build EIP-712 typed data for claimWithSig
 */
export function buildClaimTypedData(params: {
  chainId: number;
  contractAddress: `0x${string}`;
  campaignId: `0x${string}`;
  claimer: `0x${string}`;
  claimAmount: bigint;
  nonce: bigint;
  expiry: bigint;
}) {
  return {
    domain: {
      name: "ClaimCampaigns",
      version: "1",
      chainId: params.chainId,
      verifyingContract: params.contractAddress,
    },
    types: {
      Claim: [
        { name: "campaignId", type: "bytes16" },
        { name: "claimer", type: "address" },
        { name: "claimAmount", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "expiry", type: "uint256" },
      ],
    },
    primaryType: "Claim" as const,
    message: {
      campaignId: params.campaignId,
      claimer: params.claimer,
      claimAmount: params.claimAmount,
      nonce: params.nonce,
      expiry: params.expiry,
    },
  };
}

/**
 * Hedgey ClaimCampaigns contract addresses per network
 */
export const HEDGEY_CONTRACT_ADDRESSES: Record<string, `0x${string}`> = {
  optimism: "0x8A2725a6f04816A5274dDD9FEaDd3bd0C253C1A6",
  arbitrum: "0x8A2725a6f04816A5274dDD9FEaDd3bd0C253C1A6",
  sepolia: "0x66f9323C7298B98f9F91a1D3f507Bf765EbEDf0B",
  mainnet: "0x5Ae97e4770b7034C7Ca99Ab7edC26a18a23CB412",
} as const;

/**
 * Default Hedgey ClaimCampaigns contract address
 * Used as fallback when network-specific address is not found
 */
export const DEFAULT_CLAIM_CONTRACT_ADDRESS = "0x8A2725a6f04816A5274dDD9FEaDd3bd0C253C1A6" as const;

/**
 * Get the Hedgey contract address for a specific network
 */
export function getHedgeyContractAddress(networkName: string): `0x${string}` {
  return HEDGEY_CONTRACT_ADDRESSES[networkName] ?? DEFAULT_CLAIM_CONTRACT_ADDRESS;
}

/**
 * Convert a UUID string to bytes16 hex format for contract calls
 */
export function uuidToBytes16(uuid: string): `0x${string}` {
  const parsed = uuidParse(uuid);
  return toHex(new Uint8Array(parsed));
}

/**
 * Format a token amount for display with proper decimals.
 * Handles both raw BigInt values and decimal string values from APIs.
 */
export function formatTokenAmount(amount: string | bigint, decimals: number): string {
  if (typeof amount === "bigint") {
    const divisor = 10n ** BigInt(decimals);
    const integerPart = amount / divisor;
    const fractionalPart = amount % divisor;

    const fractionalStr = fractionalPart.toString().padStart(decimals, "0");
    const significantFractional = fractionalStr.slice(0, 4).replace(/0+$/, "");

    if (significantFractional) {
      return `${integerPart.toLocaleString()}.${significantFractional}`;
    }
    return integerPart.toLocaleString();
  }

  if (amount.includes(".")) {
    const num = Number.parseFloat(amount);
    if (Number.isNaN(num)) return "0";
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    });
  }

  try {
    const value = BigInt(amount);
    const divisor = 10n ** BigInt(decimals);
    const integerPart = value / divisor;
    const fractionalPart = value % divisor;

    const fractionalStr = fractionalPart.toString().padStart(decimals, "0");
    const significantFractional = fractionalStr.slice(0, 4).replace(/0+$/, "");

    if (significantFractional) {
      return `${integerPart.toLocaleString()}.${significantFractional}`;
    }
    return integerPart.toLocaleString();
  } catch {
    return "0";
  }
}

/**
 * Parse a decimal string amount to raw bigint with proper decimals.
 */
export function parseTokenAmount(amount: string, decimals: number): bigint {
  const [integerPart, fractionalPart = ""] = amount.split(".");
  const paddedFractional = fractionalPart.padEnd(decimals, "0").slice(0, decimals);
  const rawAmount = integerPart + paddedFractional;
  return BigInt(rawAmount);
}
