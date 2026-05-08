import { describe, expect, it } from "vitest";
import type { ReportSchedule } from "@/types/portfolio-report";
import {
  computeNextRuns,
  defaultScheduleForPreset,
  detectPreset,
  formatRunDate,
  formatScheduleLabel,
  isRunDate,
  RUN_DATE_REGEX,
} from "@/utilities/portfolio-reports/period";

const sched = (overrides: Partial<ReportSchedule> = {}): ReportSchedule => ({
  intervalUnit: "days",
  intervalCount: 1,
  startDate: "2026-04-01",
  ends: { kind: "never" },
  ...overrides,
});

describe("portfolio-reports period utilities", () => {
  describe("RUN_DATE_REGEX / isRunDate", () => {
    it.each(["2026-04-01", "2026-12-31", "2024-02-29", "1999-01-15"])("accepts %s", (value) => {
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
    it("formats a valid date", () => {
      const f = formatRunDate("2026-04-30");
      expect(f.label).toBe("April 30, 2026");
      expect(f.shortLabel).toBe("Apr 30, 2026");
      expect(f.badge).toBe("04/30/26");
    });

    it("falls back gracefully on garbage input", () => {
      const f = formatRunDate("not-a-date");
      expect(f.label).toBe("not-a-date");
    });
  });

  describe("formatScheduleLabel", () => {
    it("renders daily as 'Every day'", () => {
      expect(formatScheduleLabel(sched({ intervalUnit: "days", intervalCount: 1 }))).toMatch(
        /^Every day,/
      );
    });

    it("renders weekly as 'Every week'", () => {
      expect(formatScheduleLabel(sched({ intervalUnit: "weeks", intervalCount: 1 }))).toMatch(
        /^Every week,/
      );
    });

    it("calls out bi-weekly explicitly", () => {
      expect(formatScheduleLabel(sched({ intervalUnit: "weeks", intervalCount: 2 }))).toMatch(
        /^Every 2 weeks \(bi-weekly\),/
      );
    });

    it("calls out quarterly explicitly", () => {
      expect(formatScheduleLabel(sched({ intervalUnit: "months", intervalCount: 3 }))).toMatch(
        /^Every 3 months \(quarterly\),/
      );
    });

    it("renders monthly as 'Every month'", () => {
      expect(formatScheduleLabel(sched({ intervalUnit: "months", intervalCount: 1 }))).toMatch(
        /^Every month,/
      );
    });

    it("renders custom 'every N units' for non-preset values", () => {
      expect(formatScheduleLabel(sched({ intervalUnit: "days", intervalCount: 10 }))).toMatch(
        /^Every 10 days,/
      );
    });

    it("appends 'runs forever' for ends.never", () => {
      expect(formatScheduleLabel(sched())).toContain("runs forever");
    });

    it("appends 'until DATE' for ends.on_date", () => {
      const out = formatScheduleLabel(sched({ ends: { kind: "on_date", date: "2026-12-31" } }));
      expect(out).toContain("until");
      expect(out).toContain("Dec 31, 2026");
    });
  });

  describe("detectPreset", () => {
    it("matches daily/weekly/biweekly/monthly/quarterly", () => {
      expect(detectPreset(sched({ intervalUnit: "days", intervalCount: 1 }))).toBe("daily");
      expect(detectPreset(sched({ intervalUnit: "weeks", intervalCount: 1 }))).toBe("weekly");
      expect(detectPreset(sched({ intervalUnit: "weeks", intervalCount: 2 }))).toBe("biweekly");
      expect(detectPreset(sched({ intervalUnit: "months", intervalCount: 1 }))).toBe("monthly");
      expect(detectPreset(sched({ intervalUnit: "months", intervalCount: 3 }))).toBe("quarterly");
    });

    it("returns 'custom' when no preset matches", () => {
      expect(detectPreset(sched({ intervalUnit: "days", intervalCount: 10 }))).toBe("custom");
    });
  });

  describe("defaultScheduleForPreset", () => {
    it("daily resolves to (days, 1)", () => {
      const s = defaultScheduleForPreset("daily", new Date(2026, 3, 1));
      expect(s.intervalUnit).toBe("days");
      expect(s.intervalCount).toBe(1);
    });

    it("biweekly resolves to (weeks, 2)", () => {
      const s = defaultScheduleForPreset("biweekly", new Date(2026, 3, 1));
      expect(s.intervalUnit).toBe("weeks");
      expect(s.intervalCount).toBe(2);
    });

    it("quarterly resolves to (months, 3)", () => {
      const s = defaultScheduleForPreset("quarterly", new Date(2026, 3, 1));
      expect(s.intervalUnit).toBe("months");
      expect(s.intervalCount).toBe(3);
    });

    it("custom falls back to (days, 1) so the form has valid defaults", () => {
      const s = defaultScheduleForPreset("custom", new Date(2026, 3, 1));
      expect(s.intervalUnit).toBe("days");
      expect(s.intervalCount).toBe(1);
    });
  });

  describe("computeNextRuns", () => {
    const utc = (iso: string) => new Date(`${iso}T12:00:00.000Z`);

    it("emits 4 upcoming days for 'every 10 days starting May 18'", () => {
      const out = computeNextRuns(
        sched({
          intervalUnit: "days",
          intervalCount: 10,
          startDate: "2026-05-18",
        }),
        4,
        utc("2026-05-12")
      );
      expect(out.map((d) => d.toISOString().slice(0, 10))).toEqual([
        "2026-05-18",
        "2026-05-28",
        "2026-06-07",
        "2026-06-17",
      ]);
    });

    it("truncates at ends.on_date", () => {
      const out = computeNextRuns(
        sched({
          intervalUnit: "days",
          intervalCount: 7,
          startDate: "2026-04-01",
          ends: { kind: "on_date", date: "2026-04-15" },
        }),
        10,
        utc("2026-04-01")
      );
      expect(out.map((d) => d.toISOString().slice(0, 10))).toEqual([
        "2026-04-01",
        "2026-04-08",
        "2026-04-15",
      ]);
    });

    it("returns [] for invalid startDate", () => {
      expect(computeNextRuns(sched({ startDate: "garbage" }), 4)).toEqual([]);
    });
  });
});
