import { HttpError, NetworkError } from "@/utilities/api/errors";
import { describeMilestoneFailure } from "@/utilities/milestones/attestationFailure";
import { MissingMilestoneRecipientError } from "@/utilities/milestones/attestationIdentity";
import { RetryConditionNotMetError } from "@/utilities/retries";
import { SignerUnavailableError } from "@/utilities/wallet/signerReadiness";

describe("describeMilestoneFailure", () => {
  it("passes through the wallet-lifecycle guidance and keeps it out of Sentry", () => {
    const result = describeMilestoneFailure(
      new SignerUnavailableError("wallets-hydrating"),
      "verify"
    );

    expect(result.kind).toBe("signer-unavailable");
    expect(result.expected).toBe(true);
    expect(result.message).toMatch(/still being prepared/);
  });

  it("surfaces the missing-recipient guard verbatim", () => {
    const result = describeMilestoneFailure(
      new MissingMilestoneRecipientError("0xmilestone"),
      "verify"
    );

    expect(result.kind).toBe("missing-recipient");
    expect(result.expected).toBe(false);
    expect(result.message).toMatch(/missing its on-chain recipient/);
  });

  it("distinguishes an indexing timeout from a failure", () => {
    const verify = describeMilestoneFailure(new RetryConditionNotMetError(), "verify");
    const complete = describeMilestoneFailure(new RetryConditionNotMetError(), "complete");

    expect(verify.kind).toBe("indexing-timeout");
    expect(verify.expected).toBe(true);
    expect(verify.message).toMatch(/submitted on-chain and is still being indexed/);
    expect(verify.message).not.toMatch(/Failed to/);
    expect(complete.message).toMatch(/completion was submitted on-chain/);
  });

  it("names a network-switch failure", () => {
    expect(
      describeMilestoneFailure(new Error("Wallet network changed while preparing"), "verify")
    ).toMatchObject({
      kind: "network-switch",
      message: "Failed to verify milestone: couldn't switch your wallet to the required network.",
    });

    expect(
      describeMilestoneFailure({ message: "could not switch chain" }, "complete")
    ).toMatchObject({ kind: "network-switch" });
  });

  it("names an out-of-gas failure", () => {
    expect(
      describeMilestoneFailure(new Error("insufficient funds for gas * price"), "verify")
    ).toMatchObject({ kind: "insufficient-funds" });
  });

  it("reports the HTTP status for a server rejection", () => {
    const result = describeMilestoneFailure(
      new HttpError(422, { endpoint: "/v2/milestones/x/attest-completion", method: "POST" }),
      "verify"
    );

    expect(result.kind).toBe("server");
    expect(result.message).toContain("HTTP 422");
  });

  it("names a transient network failure", () => {
    expect(
      describeMilestoneFailure(
        new NetworkError({ endpoint: "/v2/projects/x/updates", method: "GET" }),
        "verify"
      )
    ).toMatchObject({ kind: "network" });

    expect(
      describeMilestoneFailure(
        Object.assign(new Error("Network Error"), { code: "ERR_NETWORK" }),
        "verify"
      )
    ).toMatchObject({ kind: "network" });
  });

  it("names a wallet RPC failure", () => {
    expect(describeMilestoneFailure(new Error("rpc error: timeout"), "verify")).toMatchObject({
      kind: "wallet-rpc",
    });
  });

  it("falls back to an explicit unknown cause rather than a bare action label", () => {
    const result = describeMilestoneFailure(new Error("something odd"), "complete");

    expect(result.kind).toBe("unknown");
    expect(result.message).toBe("Failed to complete milestone: an unexpected error occurred.");
  });
});
