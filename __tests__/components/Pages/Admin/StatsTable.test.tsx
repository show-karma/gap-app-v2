import { render, screen, within } from "@testing-library/react";
import { StatsTable } from "@/components/Pages/Admin/StatsTable";
import type { Report } from "@/hooks/useReportPageData";

vi.mock("@/components/Utilities/TablePagination", () => ({
  __esModule: true,
  default: (props: { totalPosts: number }) => (
    <div data-testid="table-pagination" data-total={props.totalPosts} />
  ),
}));

describe("StatsTable", () => {
  function makeReport(overrides: Partial<Report & { pastDueMilestones: number }> = {}) {
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
    } satisfies Report & { pastDueMilestones: number };
  }

  it("renders a Past Due column next to Pending and styles positive counts in red", () => {
    render(
      <StatsTable
        reports={[makeReport()]}
        isLoading={false}
        error={null}
        communityId="community-1"
        sortBy="totalMilestones"
        sortOrder="desc"
        onSort={vi.fn()}
        page={1}
        onPageChange={vi.fn()}
        totalItems={1}
        itemsPerPage={50}
        isFullyCompleted={() => false}
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
    const pastDueCell = within(row).getByRole("link", { name: "1" });

    expect(pastDueCell).toHaveClass("text-red-600");
  });
});
