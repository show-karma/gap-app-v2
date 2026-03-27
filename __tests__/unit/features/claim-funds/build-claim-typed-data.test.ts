import { buildClaimTypedData } from "@/src/features/claim-funds/lib/hedgey-contract";

const baseParams = {
  chainId: 10,
  contractAddress: "0x8A2725a6f04816A5274dDD9FEaDd3bd0C253C1A6" as `0x${string}`,
  campaignId: "0xaabbccdd11223344aabbccdd11223344" as `0x${string}`,
  claimer: "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`,
  claimAmount: 1000000000000000000n,
  nonce: 0n,
  expiry: 1700000000n,
};

describe("buildClaimTypedData", () => {
  it("returns correct domain with name, version, chainId, and verifyingContract", () => {
    const result = buildClaimTypedData(baseParams);
    expect(result.domain).toEqual({
      name: "ClaimCampaigns",
      version: "1",
      chainId: 10,
      verifyingContract: baseParams.contractAddress,
    });
  });

  it("sets primaryType to Claim", () => {
    const result = buildClaimTypedData(baseParams);
    expect(result.primaryType).toBe("Claim");
  });

  it("includes all five Claim type fields in correct order", () => {
    const result = buildClaimTypedData(baseParams);
    const fieldNames = result.types.Claim.map((f) => f.name);
    expect(fieldNames).toEqual(["campaignId", "claimer", "claimAmount", "nonce", "expiry"]);
  });

  it("maps Claim type fields to correct Solidity types", () => {
    const result = buildClaimTypedData(baseParams);
    const fieldTypes = result.types.Claim.map((f) => f.type);
    expect(fieldTypes).toEqual(["bytes16", "address", "uint256", "uint256", "uint256"]);
  });

  it("passes message fields through from params", () => {
    const result = buildClaimTypedData(baseParams);
    expect(result.message).toEqual({
      campaignId: baseParams.campaignId,
      claimer: baseParams.claimer,
      claimAmount: baseParams.claimAmount,
      nonce: baseParams.nonce,
      expiry: baseParams.expiry,
    });
  });

  it("uses the provided chainId in domain", () => {
    const result = buildClaimTypedData({ ...baseParams, chainId: 42161 });
    expect(result.domain.chainId).toBe(42161);
  });

  it("uses the provided contractAddress in domain", () => {
    const custom = "0x0000000000000000000000000000000000000001" as `0x${string}`;
    const result = buildClaimTypedData({ ...baseParams, contractAddress: custom });
    expect(result.domain.verifyingContract).toBe(custom);
  });

  it("preserves bigint values in message without conversion", () => {
    const result = buildClaimTypedData(baseParams);
    expect(typeof result.message.claimAmount).toBe("bigint");
    expect(typeof result.message.nonce).toBe("bigint");
    expect(typeof result.message.expiry).toBe("bigint");
  });

  it("handles zero nonce", () => {
    const result = buildClaimTypedData({ ...baseParams, nonce: 0n });
    expect(result.message.nonce).toBe(0n);
  });

  it("handles very large claimAmount", () => {
    const largeAmount = 2n ** 128n;
    const result = buildClaimTypedData({ ...baseParams, claimAmount: largeAmount });
    expect(result.message.claimAmount).toBe(largeAmount);
  });
});
