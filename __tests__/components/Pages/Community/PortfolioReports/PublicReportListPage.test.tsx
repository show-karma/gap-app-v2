import { render, screen } from "@testing-library/react";
import { PublicReportListPage } from "@/components/Pages/Community/PortfolioReports/PublicReportListPage";
import { usePublishedReports } from "@/hooks/portfolio-reports/usePortfolioReports";

vi.mock("@/hooks/portfolio-reports/usePortfolioReports");

const mockReports = vi.mocked(usePublishedReports);

const community = {
  uid: "c-1",
  details: { slug: "filpgf", name: "FIL PGF" },
} as any;

const SAME_DATE = "2026-07-06";

function makeReport(overrides: Record<string, unknown>) {
  return {
    id: "r-1",
    reportConfigId: "cfg-1",
    runDate: SAME_DATE,
    status: "published",
    content: "<h1>Report</h1><p>Body text.</p>",
    publishedAt: "2026-07-06T10:00:00.000Z",
    reportConfigName: "Quarterly Review",
    reportConfigSlug: "quarterly-review",
    ...overrides,
  };
}

function hrefs(): string[] {
  return screen
    .getAllByRole("link")
    .map((a) => a.getAttribute("href") ?? "")
    .filter((h) => h.includes("/reports/"));
}

describe("PublicReportListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gives two reports published on the same date distinct links", () => {
    mockReports.mockReturnValue({
      data: [
        makeReport({
          id: "r-quarterly",
          reportConfigId: "cfg-quarterly",
          reportConfigName: "Quarterly Review",
          reportConfigSlug: "quarterly-review",
        }),
        makeReport({
          id: "r-health",
          reportConfigId: "cfg-health",
          reportConfigName: "Portfolio Health",
          reportConfigSlug: "portfolio-health",
        }),
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    render(<PublicReportListPage community={community} />);

    const links = hrefs();
    expect(links).toContain(`/community/filpgf/reports/${SAME_DATE}/quarterly-review`);
    expect(links).toContain(`/community/filpgf/reports/${SAME_DATE}/portfolio-health`);
    expect(new Set(links).size).toBe(links.length);
  });

  it("falls back to the run-date-only link when the config slug is missing", () => {
    mockReports.mockReturnValue({
      data: [
        makeReport({
          id: "r-orphan",
          reportConfigName: null,
          reportConfigSlug: null,
        }),
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    render(<PublicReportListPage community={community} />);

    expect(hrefs()).toContain(`/community/filpgf/reports/${SAME_DATE}`);
  });

  it("renders both same-date reports rather than collapsing them", () => {
    mockReports.mockReturnValue({
      data: [
        makeReport({
          id: "r-quarterly",
          reportConfigName: "Quarterly Review",
          reportConfigSlug: "quarterly-review",
        }),
        makeReport({
          id: "r-health",
          reportConfigName: "Portfolio Health",
          reportConfigSlug: "portfolio-health",
        }),
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    render(<PublicReportListPage community={community} />);

    expect(screen.getByText("Quarterly Review")).toBeInTheDocument();
    expect(screen.getByText("Portfolio Health")).toBeInTheDocument();
    expect(screen.getByText(/2 reports/i)).toBeInTheDocument();
  });

  it("renders a spinner while loading", () => {
    mockReports.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as any);

    render(<PublicReportListPage community={community} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders an empty state when there are no reports", () => {
    mockReports.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    render(<PublicReportListPage community={community} />);

    expect(screen.getByText(/no published reports yet/i)).toBeInTheDocument();
  });

  it("renders a retry affordance on error", () => {
    mockReports.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as any);

    render(<PublicReportListPage community={community} />);

    expect(screen.getByText(/failed to load reports/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
