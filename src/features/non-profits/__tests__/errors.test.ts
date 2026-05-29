import { describe, expect, it } from "vitest";
import {
  type AppError,
  isAbortError,
  isApiError,
  isNetworkError,
  isStreamError,
  isValidationError,
} from "../lib/errors";

describe("non-profits/lib/errors — type guards", () => {
  const networkErr: AppError = { type: "NetworkError", message: "Failed to fetch" };
  const apiErr: AppError = { type: "ApiError", status: 404, message: "Not found" };
  const validationErr: AppError = {
    type: "ValidationError",
    message: "Invalid",
    cause: new Error("cause"),
  };
  const abortErr: AppError = { type: "AbortError" };
  const streamErr: AppError = { type: "StreamError", message: "Stream broke" };

  describe("isNetworkError", () => {
    it("returns true for NetworkError", () => {
      expect(isNetworkError(networkErr)).toBe(true);
    });
    it("returns false for other types", () => {
      expect(isNetworkError(apiErr)).toBe(false);
      expect(isNetworkError(abortErr)).toBe(false);
    });
  });

  describe("isApiError", () => {
    it("returns true for ApiError", () => {
      expect(isApiError(apiErr)).toBe(true);
    });
    it("returns false for other types", () => {
      expect(isApiError(networkErr)).toBe(false);
      expect(isApiError(validationErr)).toBe(false);
    });
  });

  describe("isValidationError", () => {
    it("returns true for ValidationError", () => {
      expect(isValidationError(validationErr)).toBe(true);
    });
    it("returns false for other types", () => {
      expect(isValidationError(apiErr)).toBe(false);
    });
  });

  describe("isAbortError", () => {
    it("returns true for AbortError", () => {
      expect(isAbortError(abortErr)).toBe(true);
    });
    it("returns false for other types", () => {
      expect(isAbortError(networkErr)).toBe(false);
    });
  });

  describe("isStreamError", () => {
    it("returns true for StreamError", () => {
      expect(isStreamError(streamErr)).toBe(true);
    });
    it("returns false for other types", () => {
      expect(isStreamError(abortErr)).toBe(false);
    });
  });

  describe("exhaustive — each guard only matches its own type", () => {
    const all: AppError[] = [networkErr, apiErr, validationErr, abortErr, streamErr];
    const guards = [isNetworkError, isApiError, isValidationError, isAbortError, isStreamError];

    it("each AppError matches exactly one guard", () => {
      for (const err of all) {
        const matched = guards.filter((g) => g(err));
        expect(matched).toHaveLength(1);
      }
    });
  });
});
