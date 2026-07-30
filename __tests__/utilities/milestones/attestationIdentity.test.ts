import type { GrantMilestoneWithCompletion } from "@/services/milestones";
import {
  buildAttesterCandidates,
  isEvmAddress,
  isMissingMilestoneRecipientError,
  MissingMilestoneRecipientError,
  matchesSubmittedVerification,
  requireMilestoneRecipient,
} from "@/utilities/milestones/attestationIdentity";

const RECIPIENT = "0x1111111111111111111111111111111111111111";
const SIGNER = "0x2222222222222222222222222222222222222222";
const WAGMI = "0x3333333333333333333333333333333333333333";

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
