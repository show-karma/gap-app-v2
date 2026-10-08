import {
  isExternalConfig,
  isExternalReport,
  resolveReportSource,
} from "@/utilities/portfolio-reports/source";

describe("portfolio report source helpers", () => {
  it("treats a missing source as karma (older API payloads)", () => {
    expect(resolveReportSource(undefined)).toBe("karma");
    expect(resolveReportSource(null)).toBe("karma");
    expect(isExternalReport({ source: undefined as never })).toBe(false);
    expect(isExternalConfig({ source: undefined as never })).toBe(false);
  });

  it("recognises external reports and configs", () => {
    expect(isExternalReport({ source: "external" })).toBe(true);
    expect(isExternalConfig({ source: "external" })).toBe(true);
    expect(isExternalReport({ source: "karma" })).toBe(false);
    expect(isExternalConfig({ source: "karma" })).toBe(false);
  });
});
