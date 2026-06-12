import { describe, expect, it } from "vitest";
import {
  MIN_VALID_DUE_DATE_MS,
  normalizeMilestoneDueDateMs,
} from "@/utilities/milestones/milestoneDueDate";

describe("normalizeMilestoneDueDateMs", () => {
  describe("missing / invalid input (#1198 class — never a 1970 date)", () => {
    it("returns null for null", () => {
      expect(normalizeMilestoneDueDateMs(null)).toBeNull();
    });

    it("returns null for undefined", () => {
      expect(normalizeMilestoneDueDateMs(undefined)).toBeNull();
    });

    it("returns null for 0", () => {
      expect(normalizeMilestoneDueDateMs(0)).toBeNull();
    });

    it("returns null for a negative timestamp", () => {
      expect(normalizeMilestoneDueDateMs(-1)).toBeNull();
    });

    it("returns null for NaN", () => {
      expect(normalizeMilestoneDueDateMs(Number.NaN)).toBeNull();
    });

    it("returns null for a garbage string", () => {
      expect(normalizeMilestoneDueDateMs("not-a-date")).toBeNull();
    });

    it("returns null for a value resolving before the year-2000 floor", () => {
      // 1995-06-15 in seconds — a genuinely corrupted ancient attestation value.
      const ancientSeconds = Math.floor(Date.UTC(1995, 5, 15) / 1000);
      expect(normalizeMilestoneDueDateMs(ancientSeconds)).toBeNull();
    });

    it("returns null for an ancient milliseconds value (epoch era)", () => {
      expect(normalizeMilestoneDueDateMs(1000)).toBeNull();
    });
  });

  describe("valid numeric input (seconds vs milliseconds disambiguation)", () => {
    it("treats a 10-digit number as Unix seconds", () => {
      const seconds = Math.floor(Date.UTC(2026, 0, 1) / 1000);
      expect(normalizeMilestoneDueDateMs(seconds)).toBe(seconds * 1000);
    });

    it("treats a 13-digit number as Unix milliseconds (passthrough)", () => {
      const ms = Date.UTC(2026, 0, 1);
      expect(normalizeMilestoneDueDateMs(ms)).toBe(ms);
    });
  });

  describe("numeric-string input (serialized Unix timestamps)", () => {
    it("treats a 10-digit numeric string as Unix seconds", () => {
      expect(normalizeMilestoneDueDateMs("1780000000")).toBe(1780000000 * 1000);
    });

    it("treats a 13-digit numeric string as Unix milliseconds (passthrough)", () => {
      const ms = Date.UTC(2026, 0, 1);
      expect(normalizeMilestoneDueDateMs(String(ms))).toBe(ms);
    });

    it("tolerates surrounding whitespace", () => {
      expect(normalizeMilestoneDueDateMs(" 1780000000 ")).toBe(1780000000 * 1000);
    });

    it('returns null for the numeric string "0"', () => {
      expect(normalizeMilestoneDueDateMs("0")).toBeNull();
    });

    it("returns null for an ancient numeric string (pre-2000 floor)", () => {
      expect(normalizeMilestoneDueDateMs("1000")).toBeNull();
    });
  });

  describe("string and Date input", () => {
    it("parses an ISO string", () => {
      const iso = "2026-01-01T00:00:00.000Z";
      expect(normalizeMilestoneDueDateMs(iso)).toBe(Date.parse(iso));
    });

    it("parses a date-only string", () => {
      expect(normalizeMilestoneDueDateMs("2026-01-01")).toBe(Date.parse("2026-01-01"));
    });

    it("reads a Date instance", () => {
      const date = new Date("2026-01-01T00:00:00.000Z");
      expect(normalizeMilestoneDueDateMs(date)).toBe(date.getTime());
    });
  });

  it("exposes the year-2000 validity floor", () => {
    expect(MIN_VALID_DUE_DATE_MS).toBe(Date.UTC(2000, 0, 1));
  });
});
