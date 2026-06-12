import type { AxiosError } from "axios";
import { EligibilityConflictError, extractApiErrorMessage } from "@/utilities/errors";

describe("extractApiErrorMessage", () => {
  const fallback = "Something went wrong";

  it("returns the backend response.data.message for an axios error", () => {
    const error = {
      isAxiosError: true,
      response: { data: { message: "Program is missing an AI config" } },
      message: "Request failed with status code 400",
    } as unknown as AxiosError<{ message?: string }>;

    expect(extractApiErrorMessage(error, fallback)).toBe("Program is missing an AI config");
  });

  it("falls back to the axios message when there is no response body", () => {
    const error = {
      isAxiosError: true,
      response: undefined,
      message: "Network Error",
    } as unknown as AxiosError<{ message?: string }>;

    expect(extractApiErrorMessage(error, fallback)).toBe("Network Error");
  });

  it("falls back to the axios message when response.data has no message", () => {
    const error = {
      isAxiosError: true,
      response: { data: {} },
      message: "Request failed with status code 500",
    } as unknown as AxiosError<{ message?: string }>;

    expect(extractApiErrorMessage(error, fallback)).toBe("Request failed with status code 500");
  });

  it("returns the message of a plain Error", () => {
    expect(extractApiErrorMessage(new Error("boom"), fallback)).toBe("boom");
  });

  it("returns the fallback for an Error with an empty message", () => {
    expect(extractApiErrorMessage(new Error(""), fallback)).toBe(fallback);
  });

  it("returns the fallback for a string value", () => {
    expect(extractApiErrorMessage("String error", fallback)).toBe(fallback);
  });

  it("returns the fallback for null", () => {
    expect(extractApiErrorMessage(null, fallback)).toBe(fallback);
  });

  it("returns the fallback for undefined", () => {
    expect(extractApiErrorMessage(undefined, fallback)).toBe(fallback);
  });

  it("returns the fallback for a non-axios plain object", () => {
    expect(extractApiErrorMessage({ response: { data: { message: "ignored" } } }, fallback)).toBe(
      fallback
    );
  });
});

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
