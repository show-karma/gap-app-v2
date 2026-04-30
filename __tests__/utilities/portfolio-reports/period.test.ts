import { describe, expect, it } from "vitest";
import {
  comparePeriodIds,
  formatPeriod,
  getPreviousBiweeklyId,
  getPreviousMonthId,
  getPreviousPeriodId,
  isBiweeklyId,
  isMonthlyId,
  PERIOD_ID_REGEX,
  reportTypeOfId,
} from "@/utilities/portfolio-reports/period";

describe("portfolio-reports period utilities", () => {
  describe("PERIOD_ID_REGEX", () => {
    it.each([
      "2026-04",
      "1999-01",
      "2026-12",
      "2026-04-H1",
      "2026-04-H2",
    ])("accepts %s", (value) => {
      expect(PERIOD_ID_REGEX.test(value)).toBe(true);
    });

    it.each([
      "2026-13",
      "2026-00",
      "26-04",
      "2026-04-H3",
      "2026-04-h1",
      "garbage",
    ])("rejects %s", (value) => {
      expect(PERIOD_ID_REGEX.test(value)).toBe(false);
    });
  });

  describe("isMonthlyId / isBiweeklyId / reportTypeOfId", () => {
    it("identifies monthly", () => {
      expect(isMonthlyId("2026-04")).toBe(true);
      expect(isMonthlyId("2026-04-H1")).toBe(false);
      expect(reportTypeOfId("2026-04")).toBe("portfolio_monthly");
    });

    it("identifies biweekly", () => {
      expect(isBiweeklyId("2026-04-H1")).toBe(true);
      expect(isBiweeklyId("2026-04")).toBe(false);
      expect(reportTypeOfId("2026-04-H2")).toBe("portfolio_biweekly");
    });

    it("returns null for garbage", () => {
      expect(reportTypeOfId("nope")).toBeNull();
    });
  });

  describe("formatPeriod", () => {
    it("formats monthly", () => {
      const f = formatPeriod("2026-04");
      expect(f.reportType).toBe("portfolio_monthly");
      expect(f.label).toBe("April 2026");
      expect(f.shortLabel).toBe("Apr 2026");
      expect(f.badge).toBe("04 / 26");
    });

    it("formats biweekly H1", () => {
      const f = formatPeriod("2026-04-H1");
      expect(f.reportType).toBe("portfolio_biweekly");
      expect(f.label).toBe("April 2026 — 1st half");
      expect(f.shortLabel).toBe("Apr 2026 H1");
      expect(f.badge).toBe("04-H1 / 26");
    });

    it("formats biweekly H2", () => {
      const f = formatPeriod("2026-04-H2");
      expect(f.label).toBe("April 2026 — 2nd half");
      expect(f.shortLabel).toBe("Apr 2026 H2");
    });

    it("falls back gracefully on garbage input", () => {
      const f = formatPeriod("not-a-period");
      expect(f.label).toBe("not-a-period");
    });
  });

  describe("comparePeriodIds", () => {
    it("orders chronologically", () => {
      const sorted = ["2026-03", "2026-04-H1", "2026-04-H2", "2026-04"].sort(
        comparePeriodIds
      );
      // H1 < H2 < monthly within April; March is earliest.
      expect(sorted).toEqual(["2026-03", "2026-04-H1", "2026-04-H2", "2026-04"]);
    });

    it("respects year boundaries", () => {
      const sorted = ["2026-01", "2025-12-H2", "2025-12"].sort(comparePeriodIds);
      expect(sorted).toEqual(["2025-12-H2", "2025-12", "2026-01"]);
    });
  });

  describe("getPrevious* helpers", () => {
    it("returns previous calendar month", () => {
      expect(getPreviousMonthId(new Date(2026, 3, 15))).toBe("2026-03");
    });

    it("rolls year for January monthly", () => {
      expect(getPreviousMonthId(new Date(2026, 0, 5))).toBe("2025-12");
    });

    it("returns same-month H1 when run on/after the 16th", () => {
      expect(getPreviousBiweeklyId(new Date(2026, 3, 16))).toBe("2026-04-H1");
    });

    it("returns previous-month H2 when run before the 16th", () => {
      expect(getPreviousBiweeklyId(new Date(2026, 3, 10))).toBe("2026-03-H2");
    });

    it("rolls year for January biweekly", () => {
      expect(getPreviousBiweeklyId(new Date(2026, 0, 10))).toBe("2025-12-H2");
    });

    it("dispatches via getPreviousPeriodId", () => {
      const now = new Date(2026, 3, 5);
      expect(getPreviousPeriodId("portfolio_monthly", now)).toBe("2026-03");
      expect(getPreviousPeriodId("portfolio_biweekly", now)).toBe("2026-03-H2");
    });
  });
});
