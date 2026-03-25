/**
 * @file Tests for eligibility.service.ts
 * @description Tests the fetchEligibilities service including batched proof fetching,
 *   campaign info resolution, progress callbacks, and error handling.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFetchClaimProof = vi.fn();
const mockFetchCampaignInfo = vi.fn();

vi.mock("@/features/claim-funds/lib/hedgey-api", () => ({
  fetchClaimProof: (...args: unknown[]) => mockFetchClaimProof(...args),
  fetchCampaignInfo: (...args: unknown[]) => mockFetchCampaignInfo(...args),
}));

import { fetchEligibilities } from "@/features/claim-funds/services/eligibility.service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createCampaign(id: string, title = "Campaign") {
  return { id, title } as any;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("eligibility.service — fetchEligibilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty when walletAddress is empty", async () => {
    const result = await fetchEligibilities([createCampaign("c1")], "");
    expect(result.eligibilities.size).toBe(0);
    expect(result.eligibleCampaigns).toHaveLength(0);
  });

  it("returns empty when campaigns list is empty", async () => {
    const result = await fetchEligibilities([], "0xWallet");
    expect(result.eligibilities.size).toBe(0);
  });

  it("returns eligible campaigns with proofs and info", async () => {
    mockFetchClaimProof.mockResolvedValue({
      canClaim: true,
      amount: "1000",
      proof: ["0xaa"],
    });
    mockFetchCampaignInfo.mockResolvedValue({
      title: "My Campaign",
      claimFee: "100",
      campaignStatus: "active",
    });

    const campaigns = [createCampaign("c1"), createCampaign("c2")];
    const result = await fetchEligibilities(campaigns, "0xWallet");

    expect(result.eligibilities.size).toBe(2);
    expect(result.eligibleCampaigns).toHaveLength(2);

    const elig = result.eligibilities.get("c1");
    expect(elig).toMatchObject({
      campaignId: "c1",
      canClaim: true,
      amount: "1000",
      claimFee: "100",
      title: "My Campaign",
    });
  });

  it("filters out campaigns where canClaim is false", async () => {
    mockFetchClaimProof
      .mockResolvedValueOnce({ canClaim: true, amount: "1000", proof: ["0x"] })
      .mockResolvedValueOnce({ canClaim: false, amount: "0", proof: [] });
    mockFetchCampaignInfo.mockResolvedValue({ title: "T", claimFee: "0" });

    const result = await fetchEligibilities(
      [createCampaign("c1"), createCampaign("c2")],
      "0xWallet"
    );

    expect(result.eligibilities.size).toBe(1);
    expect(result.eligibilities.has("c1")).toBe(true);
    expect(result.eligibilities.has("c2")).toBe(false);
  });

  it("returns empty when no campaigns are eligible", async () => {
    mockFetchClaimProof.mockResolvedValue({ canClaim: false, amount: "0", proof: [] });

    const result = await fetchEligibilities([createCampaign("c1")], "0xWallet");

    expect(result.eligibilities.size).toBe(0);
    expect(result.eligibleCampaigns).toHaveLength(0);
    // Should not call fetchCampaignInfo if no eligible campaigns
    expect(mockFetchCampaignInfo).not.toHaveBeenCalled();
  });

  it("handles proof fetch errors gracefully (sets null)", async () => {
    mockFetchClaimProof.mockRejectedValue(new Error("API error"));

    const result = await fetchEligibilities([createCampaign("c1")], "0xWallet");

    expect(result.eligibilities.size).toBe(0);
  });

  it("handles campaign info fetch errors gracefully", async () => {
    mockFetchClaimProof.mockResolvedValue({ canClaim: true, amount: "100", proof: ["0x"] });
    mockFetchCampaignInfo.mockRejectedValue(new Error("Info API error"));

    const result = await fetchEligibilities([createCampaign("c1", "Fallback Title")], "0xWallet");

    // Still eligible, uses campaign.title as fallback
    expect(result.eligibilities.size).toBe(1);
  });

  it("calls onProgress callback with correct counts", async () => {
    mockFetchClaimProof.mockResolvedValue({ canClaim: false, amount: "0", proof: [] });

    const onProgress = vi.fn();
    const campaigns = Array.from({ length: 15 }, (_, i) => createCampaign(`c${i}`));

    await fetchEligibilities(campaigns, "0xWallet", onProgress);

    // 15 campaigns with BATCH_SIZE=10 should produce 2 progress calls
    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenCalledWith({ checked: 10, total: 15 });
    expect(onProgress).toHaveBeenCalledWith({ checked: 15, total: 15 });
  });

  it("uses default claimFee '0' when info has no claimFee", async () => {
    mockFetchClaimProof.mockResolvedValue({ canClaim: true, amount: "500", proof: ["0x"] });
    mockFetchCampaignInfo.mockResolvedValue({ title: "T" }); // no claimFee

    const result = await fetchEligibilities([createCampaign("c1")], "0xWallet");

    const elig = result.eligibilities.get("c1");
    expect(elig?.claimFee).toBe("0");
  });

  it("uses campaign title when info title is empty", async () => {
    mockFetchClaimProof.mockResolvedValue({ canClaim: true, amount: "500", proof: ["0x"] });
    mockFetchCampaignInfo.mockResolvedValue({ title: "", claimFee: "0" });

    const result = await fetchEligibilities([createCampaign("c1", "Campaign Title")], "0xWallet");

    const elig = result.eligibilities.get("c1");
    expect(elig?.title).toBe("Campaign Title");
  });
});
