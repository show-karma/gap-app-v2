import { fetchCampaignsByNetwork } from "../../lib/hedgey-api";
import type { HedgeyCampaign } from "../../types";
import type { ClaimCampaign, ClaimProvider, HedgeyProviderConfig } from "../types";

/**
 * Hedgey claim provider implementation.
 * Integrates with Hedgey Finance's token claim infrastructure.
 */
export class HedgeyProvider implements ClaimProvider {
  readonly id = "hedgey";
  readonly name = "Hedgey Finance";

  private readonly config: HedgeyProviderConfig;
  private readonly testCampaignIds: string[] | undefined;

  constructor(config: HedgeyProviderConfig, testCampaignIds?: string[]) {
    this.config = config;
    this.testCampaignIds = testCampaignIds;
  }

  async fetchCampaigns(): Promise<ClaimCampaign[]> {
    const envCampaignIds = process.env.NEXT_PUBLIC_HEDGEY_CAMPAIGN_IDS
      ? process.env.NEXT_PUBLIC_HEDGEY_CAMPAIGN_IDS.split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      : undefined;

    const campaignIdsFilter = this.testCampaignIds ?? envCampaignIds;

    const hedgeyCampaigns = await fetchCampaignsByNetwork(this.config.networkName);

    const filteredCampaigns = campaignIdsFilter?.length
      ? hedgeyCampaigns.filter((c) => campaignIdsFilter.includes(c.id))
      : hedgeyCampaigns;

    return filteredCampaigns.map((campaign) => this.mapHedgeyCampaignToClaimCampaign(campaign));
  }

  private mapHedgeyCampaignToClaimCampaign(hedgeyCampaign: HedgeyCampaign): ClaimCampaign {
    return {
      id: hedgeyCampaign.id,
      title: "",
      token: {
        address: hedgeyCampaign.token.address,
        name: hedgeyCampaign.token.name,
        ticker: hedgeyCampaign.token.ticker,
        decimals: hedgeyCampaign.token.decimals,
      },
      totalAmount: hedgeyCampaign.totalAmount,
      totalClaimed: hedgeyCampaign.totalAmountClaimed,
      totalClaimants: hedgeyCampaign.totalAddresses,
      startTime: hedgeyCampaign.start ? new Date(hedgeyCampaign.start).getTime() : undefined,
      endTime: hedgeyCampaign.end ? new Date(hedgeyCampaign.end).getTime() : undefined,
      contractAddress: hedgeyCampaign.contractAddress,
      metadata: {
        _id: hedgeyCampaign._id,
        network: hedgeyCampaign.network,
        totalClaims: hedgeyCampaign.totalClaims,
        claimLockup: hedgeyCampaign.claimLockup,
      },
    };
  }
}

export function createHedgeyProvider(
  config: HedgeyProviderConfig,
  testCampaignIds?: string[]
): HedgeyProvider {
  return new HedgeyProvider(config, testCampaignIds);
}
