import { chainIdToNetwork, Networks } from "@show-karma/karma-gap-sdk/core/consts";
import type { GrantMilestoneWithCompletion } from "@/services/milestones";
import {
  buildAttesterCandidates,
  getMultiAttesterAddress,
  isEvmAddress,
  isMissingMilestoneRecipientError,
  MissingMilestoneRecipientError,
  matchesSubmittedVerification,
  requireMilestoneRecipient,
} from "@/utilities/milestones/attestationIdentity";

const RECIPIENT = "0x1111111111111111111111111111111111111111";
const SIGNER = "0x2222222222222222222222222222222222222222";
const WAGMI = "0x3333333333333333333333333333333333333333";

const BASE_CHAIN_ID = 8453;
/** The deployed Base MultiAttester — the attester the indexer actually records. */
const BASE_MULTI_ATTESTER = "0x7177AdC0f924b695C0294A40C4C5FEFf5EE1E141";

const milestone = (
  recipient?: string
): Pick<GrantMilestoneWithCompletion, "uid" | "recipient"> => ({
  uid: "0xmilestone",
  recipient,
});

describe("isEvmAddress", () => {
  it("accepts lower-cased addresses the indexer stores", () => {
    expect(isEvmAddress(RECIPIENT)).toBe(true);
    expect(isEvmAddress("0xAbCdEf0123456789AbCdEf0123456789AbCdEf01")).toBe(true);
  });

  it("rejects empty, short and non-hex values", () => {
    expect(isEvmAddress(undefined)).toBe(false);
    expect(isEvmAddress("")).toBe(false);
    expect(isEvmAddress("0x123")).toBe(false);
    expect(isEvmAddress("not-an-address")).toBe(false);
  });
});

describe("requireMilestoneRecipient", () => {
  it("returns the recipient when present", () => {
    expect(requireMilestoneRecipient(milestone(RECIPIENT))).toBe(RECIPIENT);
  });

  it("throws a typed, user-facing error for a legacy row with no recipient", () => {
    expect(() => requireMilestoneRecipient(milestone())).toThrow(MissingMilestoneRecipientError);
    expect(() => requireMilestoneRecipient(milestone(""))).toThrow(
      /missing its on-chain recipient/
    );
  });

  it("is recognisable across module boundaries", () => {
    let caught: unknown;
    try {
      requireMilestoneRecipient(milestone());
    } catch (error) {
      caught = error;
    }
    expect(isMissingMilestoneRecipientError(caught)).toBe(true);
    expect(isMissingMilestoneRecipientError(new Error("other"))).toBe(false);
  });
});

describe("buildAttesterCandidates", () => {
  it("lower-cases, de-duplicates and drops empties", () => {
    expect(
      buildAttesterCandidates([SIGNER.toUpperCase(), SIGNER, null, undefined, "", WAGMI])
    ).toEqual([SIGNER.toLowerCase(), WAGMI.toLowerCase()]);
  });
});

describe("getMultiAttesterAddress", () => {
  it("resolves Base to its deployed MultiAttester, lower-cased", () => {
    expect(getMultiAttesterAddress(BASE_CHAIN_ID)).toBe(BASE_MULTI_ATTESTER.toLowerCase());
  });

  it("accepts a stringified chain id, as the indexer stores it", () => {
    expect(getMultiAttesterAddress(String(BASE_CHAIN_ID))).toBe(BASE_MULTI_ATTESTER.toLowerCase());
  });

  it("resolves every SDK-supported chain rather than hardcoding one", () => {
    for (const [chainId, network] of Object.entries(chainIdToNetwork)) {
      const expected = Networks[network as keyof typeof Networks].contracts.multicall.toLowerCase();
      expect(getMultiAttesterAddress(Number(chainId))).toBe(expected);
    }
  });

  it("returns null for unsupported or malformed chain ids", () => {
    expect(getMultiAttesterAddress(999999)).toBeNull();
    expect(getMultiAttesterAddress("not-a-chain")).toBeNull();
    expect(getMultiAttesterAddress(null)).toBeNull();
    expect(getMultiAttesterAddress(undefined)).toBeNull();
  });
});

describe("matchesSubmittedVerification", () => {
  const candidates = buildAttesterCandidates([SIGNER]);

  it("is false while the verification is absent", () => {
    expect(matchesSubmittedVerification({ verificationDetails: null, candidates })).toBe(false);
  });

  it("matches the signer even when it differs from the wagmi account (#66)", () => {
    expect(
      matchesSubmittedVerification({
        verificationDetails: { verifiedBy: SIGNER.toUpperCase() },
        candidates,
      })
    ).toBe(true);
  });

  it("rejects a verification attested by an unrelated wallet", () => {
    expect(
      matchesSubmittedVerification({
        verificationDetails: { verifiedBy: WAGMI },
        candidates,
      })
    ).toBe(false);
  });

  it("matches the chain's MultiAttester, which EAS records as the attester", () => {
    // `multiAttest` submits through the MultiAttester, so it — not the signer —
    // is `msg.sender` at EAS and therefore what the indexer stores.
    const withMultiAttester = buildAttesterCandidates([
      SIGNER,
      getMultiAttesterAddress(BASE_CHAIN_ID),
    ]);

    expect(
      matchesSubmittedVerification({
        verificationDetails: { verifiedBy: BASE_MULTI_ATTESTER },
        candidates: withMultiAttester,
      })
    ).toBe(true);
  });

  it("matches another chain's MultiAttester, not just Base's", () => {
    const arbitrumChainId = 42161;
    const arbitrumMultiAttester = getMultiAttesterAddress(arbitrumChainId);

    expect(
      matchesSubmittedVerification({
        verificationDetails: { verifiedBy: arbitrumMultiAttester },
        candidates: buildAttesterCandidates([SIGNER, arbitrumMultiAttester]),
      })
    ).toBe(true);
  });

  it("does not match a MultiAttester from a different chain than the milestone's", () => {
    expect(
      matchesSubmittedVerification({
        verificationDetails: { verifiedBy: BASE_MULTI_ATTESTER },
        candidates: buildAttesterCandidates([SIGNER, getMultiAttesterAddress(42161)]),
      })
    ).toBe(false);
  });

  it("accepts a NEW verification even when the attester is unrecognised", () => {
    expect(
      matchesSubmittedVerification({
        verificationDetails: { verifiedBy: WAGMI, attestationUID: "0xnew" },
        candidates,
        previousAttestationUID: "0xold",
      })
    ).toBe(true);
  });

  it("rejects a pre-existing verification with an unrecognised attester", () => {
    // The milestone was already verified by somebody else and nothing changed
    // under our transaction — the snapshot guard must keep this false.
    expect(
      matchesSubmittedVerification({
        verificationDetails: { verifiedBy: WAGMI, attestationUID: "0xold" },
        candidates,
        previousAttestationUID: "0xold",
      })
    ).toBe(false);
  });

  it("accepts a NEW verification when the indexer has not resolved the attester", () => {
    expect(
      matchesSubmittedVerification({
        verificationDetails: { attestationUID: "0xnew" },
        candidates,
        previousAttestationUID: "0xold",
      })
    ).toBe(true);
  });

  it("does not accept a pre-existing verification with an unresolved attester", () => {
    expect(
      matchesSubmittedVerification({
        verificationDetails: { attestationUID: "0xold" },
        candidates,
        previousAttestationUID: "0xold",
      })
    ).toBe(false);
  });
});
