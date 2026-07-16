import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { PortfolioReportListPage } from "@/components/Pages/Admin/PortfolioReports/PortfolioReportListPage";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";

// Seeds the `?type=` query param (a reloaded/shared filtered URL).
const mockNuqs = vi.hoisted(() => ({ initialType: null as string | null }));

vi.mock("nuqs", () => ({
  useQueryState: (_key: string, options: { defaultValue?: unknown }) => {
    const [value, setValue] = useState<unknown>(
      mockNuqs.initialType ?? options?.defaultValue ?? null
    );
    return [value, (next: unknown) => setValue(next ?? options?.defaultValue ?? null)] as const;
  },
}));

// Radix Select → native <select> for jsdom (same convention as the public list test).
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

import {
  useDeleteReport,
  useGenerateReport,
  usePortfolioReports,
  usePublishReport,
  useRegenerateReport,
  useReportConfigs,
  useReportRowSync,
  useUnpublishReport,
} from "@/hooks/portfolio-reports/usePortfolioReports";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: vi.fn(() => "/"),
}));

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/hooks/communities/useCommunityAdminAccess");
vi.mock("@/hooks/portfolio-reports/usePortfolioReports");

const mockUseCommunityAdminAccess = vi.mocked(useCommunityAdminAccess);
const mockUsePortfolioReports = vi.mocked(usePortfolioReports);
const mockUseGenerateReport = vi.mocked(useGenerateReport);
const mockUsePublishReport = vi.mocked(usePublishReport);
const mockUseUnpublishReport = vi.mocked(useUnpublishReport);
const mockUseRegenerateReport = vi.mocked(useRegenerateReport);
const mockUseDeleteReport = vi.mocked(useDeleteReport);
const mockUseReportConfigs = vi.mocked(useReportConfigs);
const mockUseReportRowSync = vi.mocked(useReportRowSync);

function reportFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "report-1",
    reportConfigId: "config-1",
    communityId: "community-1",
    runDate: "2026-03-15",
    status: "draft",
    content: "# Report",
    dataSnapshot: {},
    modelId: "gpt-4.1",
    tokenUsage: null,
    generatedAt: "2026-04-01T00:00:00.000Z",
    generationError: null,
    publishedAt: null,
    publishedBy: null,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

const filecoinCommunity = {
  uid: "community-1",
  details: { slug: "filecoin", name: "Filecoin" },
} as any;

describe("PortfolioReportListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNuqs.initialType = null;

    mockUseCommunityAdminAccess.mockReturnValue({
      hasAccess: true,
      isLoading: false,
    } as any);

    mockUseGenerateReport.mockReturnValue({ isPending: false, mutateAsync: vi.fn() } as any);
    mockUsePublishReport.mockReturnValue({ isPending: false, mutateAsync: vi.fn() } as any);
    mockUseUnpublishReport.mockReturnValue({ isPending: false, mutateAsync: vi.fn() } as any);
    mockUseRegenerateReport.mockReturnValue({ isPending: false, mutateAsync: vi.fn() } as any);
    mockUseDeleteReport.mockReturnValue({ isPending: false, mutateAsync: vi.fn() } as any);
    mockUseReportConfigs.mockReturnValue({ data: [], isLoading: false } as any);
    // Return the initialReport passed as the second argument
    mockUseReportRowSync.mockImplementation((_slug, initialReport) => initialReport);
  });

  it("shows a Preview action for draft reports and navigates to the unified public report URL", async () => {
    const user = userEvent.setup();

    mockUsePortfolioReports.mockReturnValue({
      data: [
        {
          id: "draft-report",
          reportConfigId: "config-1",
          communityId: "community-1",
          runDate: "2026-03-15",
          status: "draft",
          markdown: "# Draft report",
          dataSnapshot: {},
          modelId: "gpt-4.1",
          tokenUsage: null,
          generatedAt: "2026-04-01T00:00:00.000Z",
          generationError: null,
          publishedAt: null,
          publishedBy: null,
          createdAt: "2026-04-01T00:00:00.000Z",
          updatedAt: "2026-04-01T00:00:00.000Z",
        },
      ],
      isLoading: false,
    } as any);

    render(
      <PortfolioReportListPage
        community={{ uid: "community-1", details: { slug: "filecoin", name: "Filecoin" } } as any}
      />
    );

    await user.click(screen.getByRole("button", { name: /preview/i }));

    expect(mockPush).toHaveBeenCalledWith("/community/filecoin/reports/2026-03-15");
  });

  it("does not show a Preview action for published reports", () => {
    mockUsePortfolioReports.mockReturnValue({
      data: [
        {
          id: "published-report",
          reportConfigId: "config-1",
          communityId: "community-1",
          runDate: "2026-03-15",
          status: "published",
          markdown: "# Published report",
          dataSnapshot: {},
          modelId: "gpt-4.1",
          tokenUsage: null,
          generatedAt: "2026-04-01T00:00:00.000Z",
          generationError: null,
          publishedAt: "2026-04-02T00:00:00.000Z",
          publishedBy: "user-1",
          createdAt: "2026-04-01T00:00:00.000Z",
          updatedAt: "2026-04-02T00:00:00.000Z",
        },
      ],
      isLoading: false,
    } as any);

    render(
      <PortfolioReportListPage
        community={{ uid: "community-1", details: { slug: "filecoin", name: "Filecoin" } } as any}
      />
    );

    expect(screen.queryByRole("button", { name: /preview/i })).not.toBeInTheDocument();
  });

  it("deletes a draft report after confirmation", async () => {
    const user = userEvent.setup();
    const deleteMutateAsync = vi.fn().mockResolvedValue(undefined);
    mockUseDeleteReport.mockReturnValue({
      isPending: false,
      mutateAsync: deleteMutateAsync,
    } as any);
    mockUsePortfolioReports.mockReturnValue({
      data: [reportFixture({ id: "draft-report", status: "draft" })],
      isLoading: false,
    } as any);

    render(<PortfolioReportListPage community={filecoinCommunity} />);

    await user.click(screen.getByRole("button", { name: /delete/i }));
    // Confirmation dialog
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(deleteMutateAsync).toHaveBeenCalledWith("draft-report");
  });

  it("shows a Delete action for failed reports", () => {
    mockUsePortfolioReports.mockReturnValue({
      data: [reportFixture({ id: "failed-report", status: "failed" })],
      isLoading: false,
    } as any);

    render(<PortfolioReportListPage community={filecoinCommunity} />);

    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("does not show a Delete action for published reports", () => {
    mockUsePortfolioReports.mockReturnValue({
      data: [reportFixture({ id: "published-report", status: "published" })],
      isLoading: false,
    } as any);

    render(<PortfolioReportListPage community={filecoinCommunity} />);

    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });

  it("does not show a Delete action for generating reports", () => {
    mockUsePortfolioReports.mockReturnValue({
      data: [reportFixture({ id: "generating-report", status: "generating" })],
      isLoading: false,
    } as any);

    render(<PortfolioReportListPage community={filecoinCommunity} />);

    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });

  describe("report type filter", () => {
    function configFixture(id: string, name: string) {
      return {
        id,
        name,
        isActive: true,
        modelId: "gpt-5.5",
        programIds: ["prog-1"],
        schedule: {
          intervalUnit: "months",
          intervalCount: 1,
          startDate: "2026-01-01",
          ends: { kind: "never" },
        },
      } as any;
    }

    it("lists a type for a config whose only report is a draft", () => {
      // The reason the admin filter is broader than the public one: drafts count.
      mockUseReportConfigs.mockReturnValue({
        data: [
          configFixture("config-pods", "Monthly Pods Report"),
          configFixture("config-bw", "Bi-Weekly"),
        ],
        isLoading: false,
      } as any);
      mockUsePortfolioReports.mockReturnValue({
        data: [
          reportFixture({ id: "r1", reportConfigId: "config-pods", status: "published" }),
          reportFixture({ id: "r2", reportConfigId: "config-bw", status: "draft" }),
        ],
        isLoading: false,
      } as any);

      render(<PortfolioReportListPage community={filecoinCommunity} />);

      const options = screen.getAllByRole("option").map((o) => o.textContent);
      expect(options).toEqual(["All report types", "Bi-Weekly", "Monthly Pods Report"]);
    });

    it("excludes a config whose only report is still generating or failed", () => {
      mockUseReportConfigs.mockReturnValue({
        data: [
          configFixture("config-pods", "Monthly Pods Report"),
          configFixture("config-bw", "Bi-Weekly"),
          configFixture("config-x", "Not Ready"),
        ],
        isLoading: false,
      } as any);
      mockUsePortfolioReports.mockReturnValue({
        data: [
          reportFixture({ id: "r1", reportConfigId: "config-pods", status: "published" }),
          reportFixture({ id: "r2", reportConfigId: "config-bw", status: "draft" }),
          reportFixture({ id: "r3", reportConfigId: "config-x", status: "generating" }),
          reportFixture({ id: "r4", reportConfigId: "config-x", status: "failed" }),
        ],
        isLoading: false,
      } as any);

      render(<PortfolioReportListPage community={filecoinCommunity} />);

      const options = screen.getAllByRole("option").map((o) => o.textContent);
      expect(options).toEqual(["All report types", "Bi-Weekly", "Monthly Pods Report"]);
      expect(options).not.toContain("Not Ready");
    });

    it("hides the filter when only one type has generated a report", () => {
      mockUseReportConfigs.mockReturnValue({
        data: [configFixture("config-pods", "Monthly Pods Report")],
        isLoading: false,
      } as any);
      mockUsePortfolioReports.mockReturnValue({
        data: [reportFixture({ id: "r1", reportConfigId: "config-pods", status: "published" })],
        isLoading: false,
      } as any);

      render(<PortfolioReportListPage community={filecoinCommunity} />);

      expect(screen.queryByLabelText(/filter reports by type/i)).not.toBeInTheDocument();
    });

    it("narrows the table to the selected type", async () => {
      const user = userEvent.setup();
      mockUseReportConfigs.mockReturnValue({
        data: [
          configFixture("config-pods", "Monthly Pods Report"),
          configFixture("config-bw", "Bi-Weekly"),
        ],
        isLoading: false,
      } as any);
      mockUsePortfolioReports.mockReturnValue({
        data: [
          reportFixture({ id: "r1", reportConfigId: "config-pods", status: "published" }),
          reportFixture({ id: "r2", reportConfigId: "config-bw", status: "draft" }),
          reportFixture({ id: "r3", reportConfigId: "config-bw", status: "published" }),
        ],
        isLoading: false,
      } as any);

      render(<PortfolioReportListPage community={filecoinCommunity} />);
      await user.selectOptions(screen.getByLabelText(/filter reports by type/i), "config-bw");

      // 3 report rows total, 2 belong to config-bw → table shows 2 "Bi-Weekly" cells.
      expect(screen.getAllByRole("cell", { name: "Bi-Weekly" })).toHaveLength(2);
      expect(screen.queryByRole("cell", { name: "Monthly Pods Report" })).not.toBeInTheDocument();
    });

    it("shows the filtered empty state and resets from a stale type param", () => {
      mockNuqs.initialType = "config-deleted-since-shared";
      mockUseReportConfigs.mockReturnValue({
        data: [
          configFixture("config-pods", "Monthly Pods Report"),
          configFixture("config-bw", "Bi-Weekly"),
        ],
        isLoading: false,
      } as any);
      mockUsePortfolioReports.mockReturnValue({
        data: [
          reportFixture({ id: "r1", reportConfigId: "config-pods", status: "published" }),
          reportFixture({ id: "r2", reportConfigId: "config-bw", status: "published" }),
        ],
        isLoading: false,
      } as any);

      render(<PortfolioReportListPage community={filecoinCommunity} />);

      expect(screen.getByText(/no reports of this type/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /show all reports/i })).toBeInTheDocument();
    });
  });
});
