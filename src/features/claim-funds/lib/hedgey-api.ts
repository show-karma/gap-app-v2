import type { CampaignInfo, CampaignStatus, ClaimProof, HedgeyCampaign } from "../types";

const HEDGEY_GRAPHQL_ENDPOINT = "https://graphql.hedgey.finance/graphql";
const HEDGEY_REST_ENDPOINT = "https://api.hedgey.finance/token-claims";

const CAMPAIGNS_QUERY = `
  query GetCampaigns($network: String!) {
    campaigns(query: { network: $network }, limit: 1000) {
      _id
      id
      network
      contractAddress
      start
      end
      totalAmount
      totalAmountClaimed
      totalClaims
      totalAddresses
      token {
        address
        decimals
        name
        ticker
      }
      claimLockup {
        cliff
        period
        periods
        start
        tokenLocker
      }
    }
  }
`;

interface GraphQLResponse<T> {
  data: T;
  errors?: Array<{ message: string }>;
}

interface CampaignsQueryResult {
  campaigns: Array<HedgeyCampaign | null>;
}

const REQUEST_TIMEOUT_MS = 30000;

/**
 * Fetch all Hedgey campaigns for a specific network
 */
export async function fetchCampaignsByNetwork(networkName: string): Promise<HedgeyCampaign[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(HEDGEY_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: CAMPAIGNS_QUERY,
        variables: {
          network: networkName,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch campaigns: ${response.statusText}`);
    }

    const result: GraphQLResponse<CampaignsQueryResult> = await response.json();

    if (result.errors?.length) {
      throw new Error(`GraphQL error: ${result.errors[0].message}`);
    }

    return result.data.campaigns.filter(
      (campaign): campaign is HedgeyCampaign => campaign !== null
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch claim proof for a specific user and campaign.
 * Returns null if the user is not in the claim list (404).
 */
export async function fetchClaimProof(
  campaignId: string,
  walletAddress: string
): Promise<ClaimProof | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const encodedCampaignId = encodeURIComponent(campaignId);
    const encodedWalletAddress = encodeURIComponent(walletAddress);
    const response = await fetch(
      `${HEDGEY_REST_ENDPOINT}/proof/${encodedCampaignId}/${encodedWalletAddress}`,
      { signal: controller.signal }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch claim proof: ${response.statusText}`);
    }

    const data = await response.json();
    return data as ClaimProof;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch campaign info (includes title and claim fee)
 */
export async function fetchCampaignInfo(campaignId: string): Promise<CampaignInfo> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const encodedCampaignId = encodeURIComponent(campaignId);
    const response = await fetch(`${HEDGEY_REST_ENDPOINT}/info/${encodedCampaignId}`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch campaign info: ${response.statusText}`);
    }

    const data = await response.json();

    const campaignStatus: CampaignStatus | undefined =
      data.campaignStatus === "active" || data.campaignStatus === "completed"
        ? data.campaignStatus
        : undefined;

    return {
      title: data.title ?? "",
      claimFee: data.claimFee ?? "0",
      campaignStatus,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
