import {
  EligibilityConflictError,
  IndexingTimeoutError,
  isSurfacedError,
  OffChainRevokeError,
} from "@/utilities/errors";

describe("EligibilityConflictError", () => {
  it("has the correct name", () => {
    const error = new EligibilityConflictError();
    expect(error.name).toBe("EligibilityConflictError");
  });

  it("extends Error", () => {
    const error = new EligibilityConflictError();
    expect(error).toBeInstanceOf(Error);
  });

  it("stores the default code property", () => {
    const error = new EligibilityConflictError();
    expect(error.code).toBe("ELIGIBILITY_CONFLICT");
  });

  it("stores a custom code when provided", () => {
    const error = new EligibilityConflictError("custom message", "CUSTOM_CODE");
    expect(error.code).toBe("CUSTOM_CODE");
  });

  it("stores the default status 409", () => {
    const error = new EligibilityConflictError();
    expect(error.status).toBe(409);
  });

  it("uses the default message when none is provided", () => {
    const error = new EligibilityConflictError();
    expect(error.message).toBe(
      "Eligibility conflict: the address is already enrolled in a conflicting program"
    );
  });

  it("uses a custom message when provided", () => {
    const error = new EligibilityConflictError("Already enrolled");
    expect(error.message).toBe("Already enrolled");
  });

  it("passes instanceof EligibilityConflictError check", () => {
    const error = new EligibilityConflictError();
    expect(error).toBeInstanceOf(EligibilityConflictError);
  });

  it("can be caught as a generic Error", () => {
    let caught: unknown;
    try {
      throw new EligibilityConflictError();
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(caught).toBeInstanceOf(EligibilityConflictError);
    expect((caught as EligibilityConflictError).name).toBe("EligibilityConflictError");
  });
});

describe("OffChainRevokeError", () => {
  it("carries the code, status and context, and defaults surfaced to false", () => {
    const error = new OffChainRevokeError("API_ERROR", "Forbidden", {
      status: 403,
      uid: "0xabc",
      chainID: 10,
    });
    expect(error.name).toBe("OffChainRevokeError");
    expect(error.code).toBe("API_ERROR");
    expect(error.status).toBe(403);
    expect(error.uid).toBe("0xabc");
    expect(error.chainID).toBe(10);
    expect(error.surfaced).toBe(false);
    expect(error).toBeInstanceOf(Error);
  });

  it("respects an explicit surfaced flag", () => {
    const error = new OffChainRevokeError("REQUEST_FAILED", "Network Error", { surfaced: true });
    expect(error.surfaced).toBe(true);
    expect(error.status).toBeUndefined();
  });
});

describe("IndexingTimeoutError", () => {
  it("defaults to an actionable refresh message and INDEXING_TIMEOUT code", () => {
    const error = new IndexingTimeoutError();
    expect(error.name).toBe("IndexingTimeoutError");
    expect(error.code).toBe("INDEXING_TIMEOUT");
    expect(error.message).toContain("indexed");
    expect(error).toBeInstanceOf(Error);
  });
});

describe("isSurfacedError", () => {
  it("is true only for errors flagged surfaced=true", () => {
    expect(isSurfacedError(new OffChainRevokeError("API_ERROR", "x", { surfaced: true }))).toBe(
      true
    );
    expect(isSurfacedError(new IndexingTimeoutError("msg", { surfaced: true }))).toBe(true);
    expect(isSurfacedError(new OffChainRevokeError("API_ERROR", "x"))).toBe(false);
    expect(isSurfacedError(new Error("plain"))).toBe(false);
    expect(isSurfacedError(null)).toBe(false);
    expect(isSurfacedError(Object.assign(new Error("ad-hoc"), { surfaced: true }))).toBe(true);
  });
});
