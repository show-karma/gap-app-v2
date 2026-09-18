import { render, screen } from "@testing-library/react";
import { PortfolioReportDocumentView } from "@/components/Pages/Community/PortfolioReports/PortfolioReportDocumentView";
import type { PortfolioReport } from "@/types/portfolio-report";

vi.mock("@/components/Pages/Community/PortfolioReports/HtmlReportFrame", () => ({
  HtmlReportFrame: ({ html }: { html: string }) => <div data-testid="karma-frame">{html}</div>,
}));
vi.mock("@/components/Pages/Community/PortfolioReports/ExternalReportFrame", () => ({
  ExternalReportFrame: ({ html }: { html: string }) => (
    <div data-testid="external-frame">{html}</div>
  ),
}));
vi.mock("@/components/Pages/Community/PortfolioReports/ReportChartsSection", () => ({
  ReportChartsSection: () => <div data-testid="report-charts-section" />,
}));
vi.mock("@/components/Pages/Community/PortfolioReports/ExportDataMenu", () => ({
  ExportDataMenu: () => <div data-testid="export-data-menu" />,
}));
vi.mock("@/components/Pages/Community/PortfolioReports/ReadingProgress", () => ({
  ReadingProgress: () => null,
}));
vi.mock("@/components/Pages/Community/PortfolioReports/BackToTop", () => ({
  BackToTop: () => null,
}));
vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const community = { uid: "c-1", details: { slug: "filecoin", name: "Filecoin" } } as never;

function reportFixture(overrides: Partial<PortfolioReport> = {}): PortfolioReport {
  return {
    id: "report-1",
    reportConfigId: "config-1",
    communityId: "c-1",
    runDate: "2026-03-15",
    status: "published",
    title: null,
    content: "<html><body>body</body></html>",
    dataSnapshot: {},
    modelId: "gpt-4.1",
    tokenUsage: null,
    source: "karma",
    generatedBy: null,
    generatedAt: "2026-04-01T00:00:00.000Z",
    generationError: null,
    publishedAt: "2026-04-02T00:00:00.000Z",
    publishedBy: "user-1",
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-02T00:00:00.000Z",
    ...overrides,
  };
}

function renderView(report: PortfolioReport) {
  return render(
    <PortfolioReportDocumentView
      community={community}
      runDate={report.runDate}
      report={report}
      backHref="/reports"
    />
  );
}

describe("PortfolioReportDocumentView renderer selection", () => {
  it("uses the Karma renderer and charts for karma reports", () => {
    renderView(reportFixture({ source: "karma" }));

    expect(screen.getByTestId("karma-frame")).toBeInTheDocument();
    expect(screen.getByTestId("report-charts-section")).toBeInTheDocument();
    expect(screen.queryByTestId("external-frame")).not.toBeInTheDocument();
    expect(screen.getByText("gpt-4.1")).toBeInTheDocument();
  });

  it("falls back to the Karma renderer when source is missing (older payloads)", () => {
    const legacy = reportFixture();
    delete (legacy as { source?: string }).source;
    renderView(legacy);

    expect(screen.getByTestId("karma-frame")).toBeInTheDocument();
    expect(screen.queryByTestId("external-frame")).not.toBeInTheDocument();
  });

  it("uses the verbatim external renderer, without Karma card styling or charts, for external reports", () => {
    renderView(reportFixture({ source: "external", generatedBy: "claude-code" }));

    const frame = screen.getByTestId("external-frame");
    expect(frame).toBeInTheDocument();
    expect(screen.queryByTestId("karma-frame")).not.toBeInTheDocument();
    expect(screen.queryByTestId("report-charts-section")).not.toBeInTheDocument();
    // Full-bleed: the external frame is not wrapped in the padded Karma card.
    expect(frame.parentElement?.className).not.toMatch(/p-4|rounded-xl|max-w-/);
    // Footer credits the agent rather than a Karma model.
    expect(screen.getByText("claude-code")).toBeInTheDocument();
  });
});
