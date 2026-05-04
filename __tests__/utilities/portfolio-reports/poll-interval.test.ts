import {
  GENERATING_POLL_INTERVAL_MS,
  isReportGenerating,
  type PortfolioReport,
  reportListPollIntervalMs,
  reportPollIntervalMs,
} from "@/types/portfolio-report";

function makeReport(overrides: Partial<PortfolioReport> = {}): PortfolioReport {
  return {
    id: "r-1",
    reportConfigId: "cfg-1",
    communityId: "0xcomm",
    runDate: "2026-04-30",
    status: "draft",
    markdown: "# md",
    dataSnapshot: {},
    modelId: "gpt-5.2",
    tokenUsage: null,
    generatedAt: "2026-04-30T10:00:00.000Z",
    generationError: null,
    publishedAt: null,
    publishedBy: null,
    createdAt: "2026-04-30T10:00:00.000Z",
    updatedAt: "2026-04-30T10:00:00.000Z",
    ...overrides,
  };
}

describe("isReportGenerating", () => {
  it("returns true only for generating status", () => {
    expect(isReportGenerating(makeReport({ status: "generating" }))).toBe(true);
    expect(isReportGenerating(makeReport({ status: "draft" }))).toBe(false);
    expect(isReportGenerating(makeReport({ status: "failed" }))).toBe(false);
    expect(isReportGenerating(makeReport({ status: "published" }))).toBe(false);
  });
});

describe("reportPollIntervalMs", () => {
  it("returns the poll interval when status is generating", () => {
    expect(reportPollIntervalMs(makeReport({ status: "generating" }))).toBe(
      GENERATING_POLL_INTERVAL_MS
    );
  });

  it("returns false for terminal statuses", () => {
    expect(reportPollIntervalMs(makeReport({ status: "draft" }))).toBe(false);
    expect(reportPollIntervalMs(makeReport({ status: "failed" }))).toBe(false);
    expect(reportPollIntervalMs(makeReport({ status: "published" }))).toBe(false);
  });

  it("returns false when report is undefined", () => {
    expect(reportPollIntervalMs(undefined)).toBe(false);
  });
});

describe("reportListPollIntervalMs", () => {
  it("returns the poll interval when any row is generating", () => {
    const reports = [
      makeReport({ id: "r-1", status: "draft" }),
      makeReport({ id: "r-2", status: "generating" }),
    ];
    expect(reportListPollIntervalMs(reports)).toBe(GENERATING_POLL_INTERVAL_MS);
  });

  it("returns false when all rows are terminal", () => {
    const reports = [
      makeReport({ id: "r-1", status: "draft" }),
      makeReport({ id: "r-2", status: "published" }),
      makeReport({ id: "r-3", status: "failed" }),
    ];
    expect(reportListPollIntervalMs(reports)).toBe(false);
  });

  it("returns false for empty or undefined input", () => {
    expect(reportListPollIntervalMs([])).toBe(false);
    expect(reportListPollIntervalMs(undefined)).toBe(false);
  });
});
