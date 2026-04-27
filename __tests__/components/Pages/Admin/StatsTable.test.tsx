import { render, screen, within } from "@testing-library/react";
import { StatsTable } from "@/components/Pages/Admin/StatsTable";
import type { Report } from "@/hooks/useReportPageData";

vi.mock("@/components/Utilities/TablePagination", () => ({
  __esModule: true,
  default: (props: { totalPosts: number }) => (
    <div data-testid="table-pagination" data-total={props.totalPosts} />
  ),
}));

const TABLE_COLUMN_COUNT = 8;

function makeReport(overrides: Partial<Report> = {}) {
  return {
    _id: { $oid: "report-1" },
    grantUid: "grant-1",
    grantTitle: "Grant Alpha",
    projectUid: "project-1",
    projectTitle: "Project Alpha",
    projectSlug: "project-alpha",
    programId: "program-1",
    totalMilestones: 6,
    pendingMilestones: 2,
    pastDueMilestones: 1,
    completedMilestones: 4,
    isGrantCompleted: false,
    proofOfWorkLinks: [],
    evaluations: [],
    ...overrides,
  } satisfies Report;
}

const baseProps = {
  communityId: "community-1",
  sortBy: "totalMilestones",
  sortOrder: "desc",
  page: 1,
  totalItems: 1,
  itemsPerPage: 50,
  isFullyCompleted: () => false,
};

describe("StatsTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loading state", () => {
    it("renders skeleton rows whose cell count matches the table column count", () => {
      const { container } = render(
        <StatsTable
          {...baseProps}
          reports={undefined}
          isLoading={true}
          error={null}
          onSort={vi.fn()}
          onPageChange={vi.fn()}
          totalItems={0}
        />
      );

      const skeletonRows = container.querySelectorAll("tbody tr");
      expect(skeletonRows.length).toBeGreaterThan(0);
      skeletonRows.forEach((row) => {
        expect(row.querySelectorAll("td").length).toBe(TABLE_COLUMN_COUNT);
      });
    });
  });

  describe("error state", () => {
    it("renders the error message spanning all columns", () => {
      const { container } = render(
        <StatsTable
          {...baseProps}
          reports={undefined}
          isLoading={false}
          error={new Error("boom")}
          onSort={vi.fn()}
          onPageChange={vi.fn()}
          totalItems={0}
        />
      );

      expect(screen.getByText("Failed to load milestone stats")).toBeInTheDocument();
      expect(screen.getByText("boom")).toBeInTheDocument();
      const errorCell = container.querySelector("tbody td");
      expect(errorCell).toHaveAttribute("colspan", String(TABLE_COLUMN_COUNT));
    });
  });

  describe("empty state", () => {
    it("renders the empty-state copy when reports is an empty array", () => {
      const { container } = render(
        <StatsTable
          {...baseProps}
          reports={[]}
          isLoading={false}
          error={null}
          onSort={vi.fn()}
          onPageChange={vi.fn()}
          totalItems={0}
        />
      );

      expect(screen.getByText("No milestone data found")).toBeInTheDocument();
      const emptyCell = container.querySelector("tbody td");
      expect(emptyCell).toHaveAttribute("colspan", String(TABLE_COLUMN_COUNT));
    });
  });

  describe("success state", () => {
    it("renders a Past Due column next to Pending and styles positive counts in red", () => {
      render(
        <StatsTable
          {...baseProps}
          reports={[makeReport()]}
          isLoading={false}
          error={null}
          onSort={vi.fn()}
          onPageChange={vi.fn()}
        />
      );

      const headers = screen.getAllByRole("columnheader");
      const pendingHeaderIndex = headers.findIndex((header) =>
        header.textContent?.includes("Pending")
      );
      const pastDueHeaderIndex = headers.findIndex((header) =>
        header.textContent?.includes("Past Due")
      );

      expect(pastDueHeaderIndex).toBeGreaterThan(pendingHeaderIndex);
      expect(pastDueHeaderIndex).toBe(pendingHeaderIndex + 1);

      const row = screen.getByRole("row", { name: /Grant Alpha/i });
      const pastDueCell = within(row).getByRole("link", {
        name: "1 past due milestones for Grant Alpha",
      });

      expect(pastDueCell).toHaveClass("text-red-600");
    });

    it("renders zero past-due counts in gray", () => {
      render(
        <StatsTable
          {...baseProps}
          reports={[makeReport({ pastDueMilestones: 0 })]}
          isLoading={false}
          error={null}
          onSort={vi.fn()}
          onPageChange={vi.fn()}
        />
      );

      const row = screen.getByRole("row", { name: /Grant Alpha/i });
      const pastDueCell = within(row).getByRole("link", {
        name: "0 past due milestones for Grant Alpha",
      });

      expect(pastDueCell).toHaveClass("text-gray-500");
      expect(pastDueCell).not.toHaveClass("text-red-600");
    });

    it("falls back to 0 when pastDueMilestones is missing from the API response", () => {
      const report = makeReport();
      // Simulate a stale backend that omits the field entirely.
      delete (report as Partial<Report>).pastDueMilestones;

      render(
        <StatsTable
          {...baseProps}
          reports={[report]}
          isLoading={false}
          error={null}
          onSort={vi.fn()}
          onPageChange={vi.fn()}
        />
      );

      const row = screen.getByRole("row", { name: /Grant Alpha/i });
      const pastDueCell = within(row).getByRole("link", {
        name: "0 past due milestones for Grant Alpha",
      });

      expect(pastDueCell).toHaveClass("text-gray-500");
    });
  });
});
