import { errAsync, okAsync, type ResultAsync } from "neverthrow";
import { describe, expect, it } from "vitest";
import type { AppError } from "../lib/errors";
import { resultToPromise } from "../lib/result-to-promise";

describe("non-profits/lib/result-to-promise", () => {
  describe("success branch", () => {
    it("resolves with the Ok value", async () => {
      const result: ResultAsync<string, AppError> = okAsync("hello");
      await expect(resultToPromise(result)).resolves.toBe("hello");
    });

    it("resolves with structured data", async () => {
      const data = { id: "1", name: "Foundation" };
      await expect(resultToPromise(okAsync(data))).resolves.toEqual(data);
    });

    it("resolves with null/undefined values", async () => {
      await expect(resultToPromise(okAsync(null))).resolves.toBeNull();
      await expect(resultToPromise(okAsync(undefined))).resolves.toBeUndefined();
    });
  });

  describe("failure branch", () => {
    it("throws the AppError on Err", async () => {
      const err: AppError = { type: "NetworkError", message: "Failed to fetch" };
      await expect(resultToPromise(errAsync(err))).rejects.toEqual(err);
    });

    it("throws ApiError so React Query can populate query.error", async () => {
      const err: AppError = { type: "ApiError", status: 404, message: "Not found" };
      await expect(resultToPromise(errAsync(err))).rejects.toMatchObject({
        type: "ApiError",
        status: 404,
      });
    });

    it("throws AbortError", async () => {
      const err: AppError = { type: "AbortError" };
      await expect(resultToPromise(errAsync(err))).rejects.toEqual({ type: "AbortError" });
    });

    it("preserves ValidationError cause", async () => {
      const cause = new Error("zod failed");
      const err: AppError = { type: "ValidationError", message: "Invalid", cause };
      await expect(resultToPromise(errAsync(err))).rejects.toMatchObject({
        type: "ValidationError",
        cause,
      });
    });
  });
});
