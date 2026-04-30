import { describe, expect, it } from "vitest";
import {
  formatRunDate,
  formatScheduleLabel,
  isRunDate,
  RUN_DATE_REGEX,
} from "@/utilities/portfolio-reports/period";

describe("portfolio-reports period utilities", () => {
  describe("RUN_DATE_REGEX / isRunDate", () => {
    it.each([
      "2026-04-01",
      "2026-12-31",
      "2024-02-29",
      "1999-01-15",
    ])("accepts %s", (value) => {
      expect(RUN_DATE_REGEX.test(value)).toBe(true);
      expect(isRunDate(value)).toBe(true);
    });

    it.each([
      "2026-04",
      "2026-04-1",
      "2026-13-01",
      "2026-00-01",
      "2026-04-32",
      "26-04-01",
      "garbage",
    ])("rejects %s", (value) => {
      expect(RUN_DATE_REGEX.test(value)).toBe(false);
      expect(isRunDate(value)).toBe(false);
    });
  });

  describe("formatRunDate", () => {
    it("formats a valid date with full month name", () => {
      const f = formatRunDate("2026-04-30");
      expect(f.label).toBe("April 30, 2026");
      expect(f.shortLabel).toBe("Apr 30, 2026");
      expect(f.badge).toBe("04/30/26");
    });

    it("falls back gracefully on garbage input", () => {
      const f = formatRunDate("not-a-date");
      expect(f.label).toBe("not-a-date");
      expect(f.shortLabel).toBe("not-a-date");
      expect(f.badge).toBe("not-a-date");
    });
  });

  describe("formatScheduleLabel", () => {
    it.each([
      [1, "1st of every month"],
      [2, "2nd of every month"],
      [3, "3rd of every month"],
      [4, "4th of every month"],
      [11, "11th of every month"],
      [12, "12th of every month"],
      [13, "13th of every month"],
      [21, "21st of every month"],
      [22, "22nd of every month"],
      [23, "23rd of every month"],
      [28, "28th of every month"],
    ])("formats day %i", (day, expected) => {
      expect(formatScheduleLabel(day)).toBe(expected);
    });
  });
});
