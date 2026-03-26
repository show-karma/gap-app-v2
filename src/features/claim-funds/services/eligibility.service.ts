import { fetchCampaignInfo, fetchClaimProof } from "../lib/hedgey-api";
import type { ClaimCampaign } from "../providers/types";
import type { CampaignInfo, ClaimEligibility, ClaimProof } from "../types";

export interface EligibilityResult {
  eligibilities: Map<string, ClaimEligibility>;
  eligibleCampaigns: ClaimCampaign[];
}

export interface EligibilityProgress {
  checked: number;
  total: number;
}

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 100;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchProofsInBatches(
  campaigns: ClaimCampaign[],
  walletAddress: string,
  onProgress?: (progress: EligibilityProgress) => void
): Promise<Map<string, ClaimProof | null>> {
  const proofResults = new Map<string, ClaimProof | null>();
  const total = campaigns.length;

  for (let i = 0; i < campaigns.length; i += BATCH_SIZE) {
    const batch = campaigns.slice(i, i + BATCH_SIZE);
    const batchProofs = await Promise.all(
      batch.map(async (campaign) => {
        try {
          const proof = await fetchClaimProof(campaign.id, walletAddress);
          return { campaignId: campaign.id, proof };
        } catch {
          return { campaignId: campaign.id, proof: null };
        }
      })
    );
    for (const { campaignId, proof } of batchProofs) {
      proofResults.set(campaignId, proof);
    }

    const checked = Math.min(i + BATCH_SIZE, total);
    onProgress?.({ checked, total });

    if (i + BATCH_SIZE < campaigns.length) {
      await delay(BATCH_DELAY_MS);
    }
  }

  return proofResults;
}

async function fetchInfosInBatches(
  campaignIds: string[]
): Promise<Map<string, CampaignInfo | null>> {
  const infoResults = new Map<string, CampaignInfo | null>();

  for (let i = 0; i < campaignIds.length; i += BATCH_SIZE) {
    const batch = campaignIds.slice(i, i + BATCH_SIZE);
    const batchInfos = await Promise.all(
      batch.map(async (campaignId) => {
        try {
          const info = await fetchCampaignInfo(campaignId);
          return { campaignId, info };
        } catch {
          return { campaignId, info: null };
        }
      })
    );
    for (const { campaignId, info } of batchInfos) {
      infoResults.set(campaignId, info);
    }
  }

  return infoResults;
}

export async function fetchEligibilities(
  campaigns: ClaimCampaign[],
  walletAddress: string,
  onProgress?: (progress: EligibilityProgress) => void
): Promise<EligibilityResult> {
  if (!walletAddress || campaigns.length === 0) {
    return { eligibilities: new Map(), eligibleCampaigns: [] };
  }

  const proofResults = await fetchProofsInBatches(campaigns, walletAddress, onProgress);

  const eligibleCampaignIds = campaigns
    .filter((c) => proofResults.get(c.id)?.canClaim)
    .map((c) => c.id);

  if (eligibleCampaignIds.length === 0) {
    return { eligibilities: new Map(), eligibleCampaigns: [] };
  }

  const infoResults = await fetchInfosInBatches(eligibleCampaignIds);

  const eligibilities = new Map<string, ClaimEligibility>();
  const eligibleCampaigns: ClaimCampaign[] = [];

  for (const campaign of campaigns) {
    const proof = proofResults.get(campaign.id);
    const info = infoResults.get(campaign.id);

    if (proof?.canClaim) {
      eligibilities.set(campaign.id, {
        campaignId: campaign.id,
        title: info?.title || campaign.title || "",
        canClaim: proof.canClaim,
        claimed: false,
        amount: proof.amount,
        proof: proof.proof,
        claimFee: info?.claimFee ?? "0",
        campaignStatus: info?.campaignStatus,
      });
      eligibleCampaigns.push(campaign);
    }
  }

  return { eligibilities, eligibleCampaigns };
}
