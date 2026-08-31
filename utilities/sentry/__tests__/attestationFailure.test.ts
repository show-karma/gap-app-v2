import * as Sentry from "@sentry/nextjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AttestRetryExhaustedError } from "@/utilities/attestWithRetry";
import {
  classifyAttestationFailure,
  isAttestationFailure,
  reportAttestationFailure,
} from "@/utilities/sentry/attestationFailure";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

/** karma-gap-sdk `AttestationError` — numeric code + `originalError`. */
function sdkWrapper(originalError: unknown) {
  const error = new Error("ATTEST_ERROR: Error during attestation.");
  Object.assign(error, { code: 50012, originalError });
  return error;
}

/** ethers v6 wrapper, verbatim shape from the production event. */
function ethersCoalesce(innerMessage: string, method = "eth_sendTransaction") {
  const error = new Error(
    `could not coalesce error (error={ "message": "${innerMessage}" }, payload={ "id": 5, "jsonrpc": "2.0", "method": "${method}" })`
  );
  Object.assign(error, { code: "UNKNOWN_ERROR", error: { message: innerMessage } });
  return error;
}

const context = { entity: "ProjectUpdate", chainId: 42161, signingMode: "external" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("isAttestationFailure", () => {
  it("recognises the sdk wrapper", () => {
    expect(isAttestationFailure(sdkWrapper(new Error("boom")))).toBe(true);
  });

  it("recognises an exhausted retry", () => {
    expect(isAttestationFailure(new AttestRetryExhaustedError(new Error("boom"), 3))).toBe(true);
  });

  it("recognises a bare provider conflict that never reached the sdk", () => {
    expect(isAttestationFailure(new RangeError("Maximum call stack size exceeded"))).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isAttestationFailure(new Error("Network Error"))).toBe(false);
    expect(isAttestationFailure(null)).toBe(false);
  });

  it("ignores an ethers error whose string `code` merely looks like the sdk's", () => {
    const error = Object.assign(new Error("call revert"), { code: "CALL_EXCEPTION" });
    expect(isAttestationFailure(error)).toBe(false);
  });
});

describe("classifyAttestationFailure", () => {
  it("classifies the GAP-FRONTEND-23J production shape as a provider conflict", () => {
    const error = sdkWrapper(ethersCoalesce("Unknown connector error"));
    // The RangeError is what Privy discarded; in production we only ever see
    // the flattened string. Attach it as the deeper cause to represent the
    // instrumented case this change creates.
    Object.assign((error as { originalError: { error: unknown } }).originalError, {
      error: new RangeError("Maximum call stack size exceeded"),
    });

    const failure = classifyAttestationFailure(error);

    expect(failure.kind).toBe("wallet-provider-conflict");
    expect(failure.retriable).toBe(false);
    expect(failure.rpcMethod).toBe("eth_sendTransaction");
  });

  it("never marks a conflict retriable, because retrying cannot work", () => {
    const failure = classifyAttestationFailure(new RangeError("Maximum call stack size exceeded"));
    expect(failure.retriable).toBe(false);
  });

  it("classifies an exhausted retry above any text matching", () => {
    const exhausted = new AttestRetryExhaustedError(ethersCoalesce("Wallet timeout"), 3);
    expect(classifyAttestationFailure(exhausted).kind).toBe("retry-exhausted");
  });

  it("classifies the June ERC-4337 rejection separately from the connector failure", () => {
    const error = sdkWrapper(
      Object.assign(new Error("could not coalesce error"), {
        code: "UNKNOWN_ERROR",
        error: { message: "Invalid fields set on User Operation." },
      })
    );
    expect(classifyAttestationFailure(error).kind).toBe("gasless-userop");
  });

  it("classifies an on-chain rejection", () => {
    expect(classifyAttestationFailure(sdkWrapper(new Error("insufficient funds"))).kind).toBe(
      "chain-rejected"
    );
    expect(classifyAttestationFailure(sdkWrapper(new Error("execution reverted: no"))).kind).toBe(
      "chain-rejected"
    );
  });

  it("falls back to unclassified rather than guessing", () => {
    const failure = classifyAttestationFailure(sdkWrapper(new Error("something new")));
    expect(failure.kind).toBe("unclassified");
    expect(failure.retriable).toBe(true);
  });

  it("surfaces the deepest cause message, which the sdk's constant hides", () => {
    const failure = classifyAttestationFailure(sdkWrapper(new Error("the real reason")));
    expect(failure.causeMessage).toBe("the real reason");
    expect(failure.causeMessage).not.toContain("Error during attestation");
  });

  it("recovers the rpc method from the ethers payload", () => {
    const failure = classifyAttestationFailure(
      sdkWrapper(ethersCoalesce("Wallet timeout", "eth_signTypedData_v4"))
    );
    expect(failure.rpcMethod).toBe("eth_signTypedData_v4");
  });
});

describe("reportAttestationFailure", () => {
  it("fingerprints by entity and kind instead of the sdk's constant message", () => {
    reportAttestationFailure(new RangeError("Maximum call stack size exceeded"), { context });

    const [, options] = vi.mocked(Sentry.captureException).mock.calls[0];
    expect(options?.fingerprint).toEqual([
      "attestation",
      "ProjectUpdate",
      "wallet-provider-conflict",
    ]);
  });

  it("tags the facts a triager needs", () => {
    reportAttestationFailure(sdkWrapper(ethersCoalesce("Wallet timeout")), { context });

    const [, options] = vi.mocked(Sentry.captureException).mock.calls[0];
    expect(options?.tags).toMatchObject({
      "attest.kind": "unclassified",
      "attest.entity": "ProjectUpdate",
      "attest.chain_id": "42161",
      "attest.signing_mode": "external",
      "attest.rpc_method": "eth_sendTransaction",
    });
  });

  it("omits tags for context it does not have rather than emitting empty ones", () => {
    reportAttestationFailure(new Error("boom"), { context: { entity: "Milestone" } });

    const [, options] = vi.mocked(Sentry.captureException).mock.calls[0];
    expect(options?.tags).not.toHaveProperty("attest.chain_id");
    expect(options?.tags).not.toHaveProperty("attest.wallet");
  });

  it("puts the hidden cause message on the event", () => {
    reportAttestationFailure(sdkWrapper(new Error("the real reason")), {
      context,
      errorMessage: "Error creating project activity",
      extra: { projectUID: "0xabc" },
    });

    const [, options] = vi.mocked(Sentry.captureException).mock.calls[0];
    expect(options?.extra).toMatchObject({
      attestCauseMessage: "the real reason",
      errorMessage: "Error creating project activity",
      projectUID: "0xabc",
    });
  });

  it("captures the original exception, not a rewritten one", () => {
    const error = sdkWrapper(new Error("boom"));
    reportAttestationFailure(error, { context });
    expect(vi.mocked(Sentry.captureException).mock.calls[0][0]).toBe(error);
  });
});
