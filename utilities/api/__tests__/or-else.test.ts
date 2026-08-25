import { ContractViolationError, HttpError, NetworkError } from "@/utilities/api/errors";
import { orElse } from "@/utilities/api/or-else";

describe("orElse", () => {
  it("resolves to the promise's value on success", async () => {
    const result = await orElse(Promise.resolve("actual"), "fallback");
    expect(result).toBe("actual");
  });

  it("falls back on a NetworkError", async () => {
    const error = new NetworkError({ endpoint: "/things", method: "GET" });
    const result = await orElse(Promise.reject(error), "fallback");
    expect(result).toBe("fallback");
  });

  it("falls back on a 429 HttpError", async () => {
    const error = new HttpError(429, { endpoint: "/things", method: "GET" });
    const result = await orElse(Promise.reject(error), "fallback");
    expect(result).toBe("fallback");
  });

  it("rethrows a ContractViolationError", async () => {
    const error = new ContractViolationError({
      endpoint: "/things",
      method: "GET",
      issues: ["bad"],
    });
    await expect(orElse(Promise.reject(error), "fallback")).rejects.toBe(error);
  });

  it("rethrows a 500 HttpError", async () => {
    const error = new HttpError(500, { endpoint: "/things", method: "GET" });
    await expect(orElse(Promise.reject(error), "fallback")).rejects.toBe(error);
  });

  it("rethrows a non-ApiError", async () => {
    const error = new Error("boom");
    await expect(orElse(Promise.reject(error), "fallback")).rejects.toBe(error);
  });
});
