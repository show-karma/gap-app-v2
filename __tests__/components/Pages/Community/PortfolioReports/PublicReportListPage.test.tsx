import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { PublicReportListPage } from "@/components/Pages/Community/PortfolioReports/PublicReportListPage";
import { usePublishedReports } from "@/hooks/portfolio-reports/usePortfolioReports";

vi.mock("nuqs", () => ({
  useQueryState: (_key: string, options: { defaultValue?: unknown }) => {
    const [value, setValue] = useState<unknown>(options?.defaultValue ?? null);
    // Mirrors nuqs: setting null drops the param, so the hook falls back to
    // the default value rather than storing a literal null.
    return [value, (next: unknown) => setValue(next ?? options?.defaultValue ?? null)] as const;
  },
}));

// Radix Select is portal/pointer-driven and awkward in jsdom; mock it to a
// native <select> (the same convention used by ApplicationsFullView's tests).
vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
  }) => (
    <select
      aria-label="Filter reports by type"
      onChange={(e) => onValueChange(e.target.value)}
      value={value}
    >
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

vi.mock("@/hooks/portfolio-reports/usePortfolioReports");

const mockUsePublishedReports = vi.mocked(usePublishedReports);

const community = {
  uid: "community-1",
  details: { slug: "filecoin", name: "Filecoin" },
} as any;

function createReport(overrides: Record<string, unknown> = {}) {
  return {
    id: "report-1",
    reportConfigId: "config-pods",
    reportConfigName: "Monthly Pods Report",
    reportConfigSlug: "monthly-pods-report",
    communityId: "community-1",
    runDate: "2026-07-06",
    status: "published",
    title: null,
    content: "<h1>Monthly Pods Report</h1>",
    dataSnapshot: {},
    modelId: "gpt-5.5",
    tokenUsage: null,
    generatedAt: "2026-07-06T00:00:00.000Z",
    generationError: null,
    publishedAt: "2026-07-06T00:00:00.000Z",
    publishedBy: "0xadmin",
    createdAt: "2026-07-06T00:00:00.000Z",
    updatedAt: "2026-07-06T00:00:00.000Z",
    ...overrides,
  };
}

/** Mirrors the live Filecoin shape: 3 configs, 2 runs each, titles repeated. */
function filecoinReports() {
  return [
    createReport({
      id: "r1",
      reportConfigId: "config-biweekly",
      reportConfigName: "Bi-Weekly Progress Report",
      reportConfigSlug: "bi-weekly-progress-report",
      runDate: "2026-07-09",
    }),
    createReport({
      id: "r2",
      reportConfigId: "config-pods",
      reportConfigName: "Monthly Pods Report",
      reportConfigSlug: "monthly-pods-report",
      runDate: "2026-07-06",
    }),
    createReport({
      id: "r3",
      reportConfigId: "config-propgf",
      reportConfigName: "Filecoin ProPGF Monthly",
      reportConfigSlug: "filecoin-propgf-monthly",
      runDate: "2026-06-30",
    }),
    createReport({
      id: "r4",
      reportConfigId: "config-biweekly",
      reportConfigName: "Bi-Weekly Progress Report",
      reportConfigSlug: "bi-weekly-progress-report",
      runDate: "2026-06-22",
    }),
    createReport({
      id: "r5",
      reportConfigId: "config-pods",
      reportConfigName: "Monthly Pods Report",
      reportConfigSlug: "monthly-pods-report",
      runDate: "2026-06-17",
    }),
    createReport({
      id: "r6",
      reportConfigId: "config-propgf",
      reportConfigName: "Filecoin ProPGF Monthly",
      reportConfigSlug: "filecoin-propgf-monthly",
      runDate: "2026-06-03",
    }),
  ];
}

describe("PublicReportListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loading, error, and empty states", () => {
    it("should_render_spinner_when_reports_are_loading", () => {
      mockUsePublishedReports.mockReturnValue({ isLoading: true } as any);

      const { container } = render(<PublicReportListPage community={community} />);

      expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    });

    it("should_render_retry_when_the_fetch_fails", () => {
      mockUsePublishedReports.mockReturnValue({ isError: true, refetch: vi.fn() } as any);

      render(<PublicReportListPage community={community} />);

      expect(screen.getByText(/failed to load reports/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });

    it("should_render_empty_state_when_there_are_no_published_reports", () => {
      mockUsePublishedReports.mockReturnValue({ data: [], isLoading: false } as any);

      render(<PublicReportListPage community={community} />);

      expect(screen.getByText(/no published reports yet/i)).toBeInTheDocument();
    });
  });

  describe("report title resolution", () => {
    it("should_prefer_the_admin_authored_title_over_the_config_name", () => {
      mockUsePublishedReports.mockReturnValue({
        data: [createReport({ title: "Monthly Pods Report — June 2026" })],
        isLoading: false,
      } as any);

      render(<PublicReportListPage community={community} />);

      expect(
        screen.getByRole("heading", { name: "Monthly Pods Report — June 2026" })
      ).toBeInTheDocument();
    });

    it("should_fall_back_to_the_config_name_when_untitled", () => {
      mockUsePublishedReports.mockReturnValue({
        data: [createReport({ title: null })],
        isLoading: false,
      } as any);

      render(<PublicReportListPage community={community} />);

      expect(screen.getByRole("heading", { name: "Monthly Pods Report" })).toBeInTheDocument();
    });

    it("should_fall_back_to_the_config_name_when_the_api_omits_title_entirely", () => {
      // Deploy-order safety: if this ships before the indexer adds `title`,
      // the field is absent rather than null and every report must render
      // exactly as it does today.
      const { title: _omitted, ...withoutTitle } = createReport();
      mockUsePublishedReports.mockReturnValue({ data: [withoutTitle], isLoading: false } as any);

      render(<PublicReportListPage community={community} />);

      expect(screen.getByRole("heading", { name: "Monthly Pods Report" })).toBeInTheDocument();
    });

    it("should_fall_back_to_a_content_heading_when_untitled_and_the_config_is_deleted", () => {
      mockUsePublishedReports.mockReturnValue({
        data: [
          createReport({
            title: null,
            reportConfigName: null,
            content: "<h1>Scraped From Content</h1>",
          }),
        ],
        isLoading: false,
      } as any);

      render(<PublicReportListPage community={community} />);

      expect(screen.getByRole("heading", { name: "Scraped From Content" })).toBeInTheDocument();
    });

    it("should_fall_back_to_the_run_date_when_no_other_source_names_the_report", () => {
      mockUsePublishedReports.mockReturnValue({
        data: [createReport({ title: null, reportConfigName: null, content: "" })],
        isLoading: false,
      } as any);

      render(<PublicReportListPage community={community} />);

      expect(screen.getByRole("heading", { name: "July 6, 2026" })).toBeInTheDocument();
    });
  });

  // Carried over from the same-date-collision work (#1855), which this branch
  // is stacked on: two configs can publish on one day, so a run-date-only link
  // cannot address a report. Kept here because both PRs touch this list.
  describe("same-date report links", () => {
    const SAME_DATE = "2026-07-06";

    function hrefs(): string[] {
      return screen
        .getAllByRole("link")
        .map((a) => a.getAttribute("href") ?? "")
        .filter((h) => h.includes("/reports/"));
    }

    it("gives two reports published on the same date distinct links", () => {
      mockUsePublishedReports.mockReturnValue({
        data: [
          createReport({
            id: "r-quarterly",
            reportConfigId: "cfg-quarterly",
            reportConfigName: "Quarterly Review",
            reportConfigSlug: "quarterly-review",
            runDate: SAME_DATE,
          }),
          createReport({
            id: "r-health",
            reportConfigId: "cfg-health",
            reportConfigName: "Portfolio Health",
            reportConfigSlug: "portfolio-health",
            runDate: SAME_DATE,
          }),
        ],
        isLoading: false,
      } as any);

      render(<PublicReportListPage community={community} />);

      const links = hrefs();
      expect(links).toContain(`/community/filecoin/reports/${SAME_DATE}/quarterly-review`);
      expect(links).toContain(`/community/filecoin/reports/${SAME_DATE}/portfolio-health`);
      expect(new Set(links).size).toBe(links.length);
    });

    it("falls back to the run-date-only link when the config slug is missing", () => {
      mockUsePublishedReports.mockReturnValue({
        data: [
          createReport({
            id: "r-orphan",
            reportConfigName: null,
            reportConfigSlug: null,
            runDate: SAME_DATE,
          }),
        ],
        isLoading: false,
      } as any);

      render(<PublicReportListPage community={community} />);

      expect(hrefs()).toContain(`/community/filecoin/reports/${SAME_DATE}`);
    });

    it("renders both same-date reports rather than collapsing them", () => {
      mockUsePublishedReports.mockReturnValue({
        data: [
          createReport({
            id: "r-quarterly",
            reportConfigId: "cfg-quarterly",
            reportConfigName: "Quarterly Review",
            reportConfigSlug: "quarterly-review",
            runDate: SAME_DATE,
          }),
          createReport({
            id: "r-health",
            reportConfigId: "cfg-health",
            reportConfigName: "Portfolio Health",
            reportConfigSlug: "portfolio-health",
            runDate: SAME_DATE,
          }),
        ],
        isLoading: false,
      } as any);

      render(<PublicReportListPage community={community} />);

      // Scoped to headings: each config name now also appears as an option in
      // the type filter this branch adds, so a bare text match is ambiguous.
      expect(screen.getByRole("heading", { name: "Quarterly Review" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Portfolio Health" })).toBeInTheDocument();
      expect(screen.getByText(/2 reports/i)).toBeInTheDocument();
    });

    it("keeps same-date links distinct when a title is set on one of them", () => {
      // The two features interact here: a title changes what the card *reads*,
      // never where it *points* — the link still keys off runDate + configSlug.
      mockUsePublishedReports.mockReturnValue({
        data: [
          createReport({
            id: "r-quarterly",
            reportConfigId: "cfg-quarterly",
            reportConfigName: "Quarterly Review",
            reportConfigSlug: "quarterly-review",
            title: "Quarterly Review — Q2 2026",
            runDate: SAME_DATE,
          }),
          createReport({
            id: "r-health",
            reportConfigId: "cfg-health",
            reportConfigName: "Portfolio Health",
            reportConfigSlug: "portfolio-health",
            runDate: SAME_DATE,
          }),
        ],
        isLoading: false,
      } as any);

      render(<PublicReportListPage community={community} />);

      expect(
        screen.getByRole("heading", { name: "Quarterly Review — Q2 2026" })
      ).toBeInTheDocument();
      const links = hrefs();
      expect(links).toContain(`/community/filecoin/reports/${SAME_DATE}/quarterly-review`);
      expect(new Set(links).size).toBe(links.length);
    });
  });

  describe("report type filter", () => {
    it("should_list_each_config_once_as_a_type_option", () => {
      mockUsePublishedReports.mockReturnValue({ data: filecoinReports(), isLoading: false } as any);

      render(<PublicReportListPage community={community} />);

      const options = screen.getAllByRole("option").map((o) => o.textContent);
      expect(options).toEqual([
        "All report types",
        "Bi-Weekly Progress Report",
        "Filecoin ProPGF Monthly",
        "Monthly Pods Report",
      ]);
    });

    it("should_hide_the_filter_when_only_one_type_exists", () => {
      mockUsePublishedReports.mockReturnValue({ data: [createReport()], isLoading: false } as any);

      render(<PublicReportListPage community={community} />);

      expect(screen.queryByLabelText(/filter reports by type/i)).not.toBeInTheDocument();
    });

    it("should_show_every_report_before_a_type_is_picked", () => {
      mockUsePublishedReports.mockReturnValue({ data: filecoinReports(), isLoading: false } as any);

      render(<PublicReportListPage community={community} />);

      expect(screen.getByText(/^6 reports/)).toBeInTheDocument();
      expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(6);
    });

    it("should_narrow_the_list_to_the_picked_type", async () => {
      const user = userEvent.setup();
      mockUsePublishedReports.mockReturnValue({ data: filecoinReports(), isLoading: false } as any);

      render(<PublicReportListPage community={community} />);
      await user.selectOptions(screen.getByLabelText(/filter reports by type/i), "config-pods");

      const headings = screen.getAllByRole("heading", { level: 2 });
      expect(headings).toHaveLength(2);
      for (const heading of headings) {
        expect(heading).toHaveTextContent("Monthly Pods Report");
      }
    });

    it("should_pluralize_the_count_for_a_single_matching_report", async () => {
      const user = userEvent.setup();
      mockUsePublishedReports.mockReturnValue({
        data: [
          createReport({ id: "r1", reportConfigId: "config-pods" }),
          createReport({
            id: "r2",
            reportConfigId: "config-biweekly",
            reportConfigName: "Bi-Weekly Progress Report",
          }),
        ],
        isLoading: false,
      } as any);

      render(<PublicReportListPage community={community} />);
      await user.selectOptions(screen.getByLabelText(/filter reports by type/i), "config-pods");

      expect(screen.getByText(/^1 report /)).toBeInTheDocument();
    });

    it("should_restore_every_report_when_the_filter_is_reset", async () => {
      const user = userEvent.setup();
      mockUsePublishedReports.mockReturnValue({ data: filecoinReports(), isLoading: false } as any);

      render(<PublicReportListPage community={community} />);
      const select = screen.getByLabelText(/filter reports by type/i);
      await user.selectOptions(select, "config-pods");
      await user.selectOptions(select, "all");

      expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(6);
    });

    it("should_offer_a_reset_when_a_stale_type_param_matches_nothing", async () => {
      const user = userEvent.setup();
      mockUsePublishedReports.mockReturnValue({ data: filecoinReports(), isLoading: false } as any);

      render(<PublicReportListPage community={community} />);
      // A shared link whose config has since been deleted.
      await user.selectOptions(screen.getByLabelText(/filter reports by type/i), "config-propgf");
      expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(2);

      await user.selectOptions(screen.getByLabelText(/filter reports by type/i), "all");

      expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(6);
    });
  });
});
