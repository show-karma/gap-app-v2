import { sanitizeErrorMessage } from "@/src/features/claim-funds/lib/error-messages";

describe("sanitizeErrorMessage", () => {
  // ── User rejection patterns ────────────────────────────────────────────────

  it("recognises 'user rejected' as a rejection", () => {
    const result = sanitizeErrorMessage(new Error("User rejected the request"));
    expect(result.title).toBe("Transaction Rejected");
    expect(result.message).toBe("You rejected the transaction request.");
  });

  it("recognises 'denied' as a rejection", () => {
    const result = sanitizeErrorMessage(new Error("Request denied by user"));
    expect(result.title).toBe("Transaction Rejected");
  });

  it("recognises 'user denied' as a rejection", () => {
    const result = sanitizeErrorMessage("User denied transaction");
    expect(result.title).toBe("Transaction Rejected");
  });

  it("recognises plain 'rejected' as a rejection", () => {
    const result = sanitizeErrorMessage(new Error("Transaction was rejected"));
    expect(result.title).toBe("Transaction Rejected");
  });

  // ── Insufficient funds ─────────────────────────────────────────────────────

  it("matches 'insufficient funds'", () => {
    const result = sanitizeErrorMessage(new Error("insufficient funds for gas"));
    expect(result.title).toBe("Insufficient Funds");
    expect(result.message).toBe("Your wallet doesn't have enough funds for this transaction.");
  });

  it("matches 'insufficient balance'", () => {
    const result = sanitizeErrorMessage(new Error("insufficient balance"));
    expect(result.title).toBe("Insufficient Funds");
  });

  // ── Pending request ────────────────────────────────────────────────────────

  it("matches 'already pending'", () => {
    const result = sanitizeErrorMessage(new Error("already pending request"));
    expect(result.title).toBe("Request Pending");
  });

  it("matches 'pending request'", () => {
    const result = sanitizeErrorMessage(new Error("pending request in wallet"));
    expect(result.title).toBe("Request Pending");
  });

  // ── Network / chain errors ─────────────────────────────────────────────────

  it("matches 'wrong network'", () => {
    const result = sanitizeErrorMessage(new Error("wrong network detected"));
    expect(result.title).toBe("Network Error");
  });

  it("matches 'chain mismatch'", () => {
    const result = sanitizeErrorMessage(new Error("chain mismatch"));
    expect(result.title).toBe("Network Error");
  });

  it("matches 'wallet_switchethereumchain'", () => {
    const result = sanitizeErrorMessage(new Error("wallet_switchEthereumChain failed"));
    expect(result.title).toBe("Network Error");
    expect(result.message).toBe("Please switch to the correct network in your wallet.");
  });

  // ── Reverted transactions ──────────────────────────────────────────────────

  it("matches 'execution reverted'", () => {
    const result = sanitizeErrorMessage(new Error("execution reverted: insufficient allowance"));
    expect(result.title).toBe("Transaction Failed");
  });

  // ── Timeout ────────────────────────────────────────────────────────────────

  it("matches 'timeout'", () => {
    const result = sanitizeErrorMessage(new Error("request timeout"));
    expect(result.title).toBe("Request Timeout");
    expect(result.message).toBe("The request timed out. Please try again.");
  });

  it("matches 'timed out'", () => {
    const result = sanitizeErrorMessage(new Error("operation timed out"));
    expect(result.title).toBe("Request Timeout");
  });

  // ── Disconnected ───────────────────────────────────────────────────────────

  it("matches 'disconnected'", () => {
    const result = sanitizeErrorMessage(new Error("wallet disconnected"));
    expect(result.title).toBe("Wallet Disconnected");
  });

  it("matches 'not connected'", () => {
    const result = sanitizeErrorMessage(new Error("provider not connected"));
    expect(result.title).toBe("Wallet Disconnected");
  });

  // ── Nonce / replacement ────────────────────────────────────────────────────

  it("matches 'nonce' errors", () => {
    const result = sanitizeErrorMessage(new Error("nonce too low"));
    expect(result.title).toBe("Transaction Conflict");
  });

  it("matches 'replacement' errors", () => {
    const result = sanitizeErrorMessage(new Error("replacement transaction underpriced"));
    expect(result.title).toBe("Transaction Conflict");
  });

  // ── Case insensitivity ─────────────────────────────────────────────────────

  it("pattern matching is case-insensitive", () => {
    const result = sanitizeErrorMessage(new Error("INSUFFICIENT FUNDS"));
    expect(result.title).toBe("Insufficient Funds");
  });

  // ── Prefix stripping ──────────────────────────────────────────────────────

  it("strips TransactionExecutionError: prefix from unknown errors", () => {
    const result = sanitizeErrorMessage(
      new Error("TransactionExecutionError: something unusual happened")
    );
    expect(result.message).toBe("something unusual happened");
  });

  it("strips ContractFunctionExecutionError: prefix", () => {
    const result = sanitizeErrorMessage(
      new Error("ContractFunctionExecutionError: bad call")
    );
    expect(result.message).toBe("bad call");
  });

  it("strips Error: prefix", () => {
    const result = sanitizeErrorMessage(new Error("Error: oops"));
    expect(result.message).toBe("oops");
  });

  // ── Message truncation ─────────────────────────────────────────────────────

  it("extracts the first sentence when short enough", () => {
    const result = sanitizeErrorMessage(new Error("First sentence here. Second sentence."));
    expect(result.message).toBe("First sentence here");
  });

  it("truncates to 100 chars with ellipsis when message is very long", () => {
    const longMsg = "a".repeat(200);
    const result = sanitizeErrorMessage(new Error(longMsg));
    expect(result.message).toHaveLength(100);
    expect(result.message).toMatch(/\.\.\.$/);
  });

  // ── Fallback for empty / object messages ───────────────────────────────────

  it("falls back for [object Object]", () => {
    const result = sanitizeErrorMessage("[object Object]");
    expect(result.message).toBe("Something went wrong. Please try again.");
  });

  it("uses 'Unknown error' for empty string input (falsy coalesces)", () => {
    const result = sanitizeErrorMessage("");
    expect(result.message).toBe("Unknown error");
  });

  // ── Non-standard inputs ────────────────────────────────────────────────────

  it("uses 'Unknown error' for null input", () => {
    const result = sanitizeErrorMessage(null);
    expect(result.message).toBe("Unknown error");
  });

  it("uses 'Unknown error' for undefined input", () => {
    const result = sanitizeErrorMessage(undefined);
    expect(result.message).toBe("Unknown error");
  });

  it("converts non-string, non-Error input to string", () => {
    const result = sanitizeErrorMessage(42);
    expect(result.message).toBe("42");
  });

  // ── Default title ──────────────────────────────────────────────────────────

  it("uses the default title for unrecognised errors", () => {
    const result = sanitizeErrorMessage(new Error("some unknown thing"));
    expect(result.title).toBe("Error");
  });

  it("accepts a custom default title", () => {
    const result = sanitizeErrorMessage(new Error("some unknown thing"), "Claim Failed");
    expect(result.title).toBe("Claim Failed");
  });
});
