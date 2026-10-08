import type { PortfolioReport, ReportConfig, ReportSource } from "@/types/portfolio-report";

/**
 * Reports and configs that predate the `source` field arrive without it.
 * Everything that existed before external reports was produced by Karma, so a
 * missing value reads as `karma`.
 */
export function resolveReportSource(source: ReportSource | undefined | null): ReportSource {
  return source === "external" ? "external" : "karma";
}

export function isExternalReport(report: Pick<PortfolioReport, "source">): boolean {
  return resolveReportSource(report.source) === "external";
}

export function isExternalConfig(config: Pick<ReportConfig, "source">): boolean {
  return resolveReportSource(config.source) === "external";
}
