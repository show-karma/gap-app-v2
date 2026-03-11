import { EligibilityConflictError } from "@/utilities/errors";

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
