import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ResearchReportDetail } from "@/types/donor-research";

const useAdminReportMock = vi.fn();

vi.mock("@/hooks/useAdminDonorResearch", () => ({
  useAdminReport: (id: string | null) => useAdminReportMock(id),
}));

vi.mock("../common/DonorResearchLoading", () => ({
  DonorResearchLoading: ({ label }: { label: string }) => <div>{label}</div>,
}));

vi.mock("../report-brief/ReportBrief", () => ({
  ReportBrief: ({ variant }: { variant: string }) => (
    <div data-testid="report-brief" data-variant={variant} />
  ),
}));

import { AdminReportView } from "./AdminReportView";

describe("AdminReportView", () => {
  afterEach(() => {
    useAdminReportMock.mockReset();
  });

  it("shows the loading state while fetching", () => {
    useAdminReportMock.mockReturnValue({ isLoading: true, isError: false });

    render(<AdminReportView reportId="r1" />);

    expect(screen.getByText(/loading report/i)).toBeInTheDocument();
  });

  it("renders the shared-variant brief once loaded", () => {
    useAdminReportMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { status: "complete", candidates: [] } as unknown as ResearchReportDetail,
    });

    render(<AdminReportView reportId="r1" />);

    const brief = screen.getByTestId("report-brief");
    expect(brief).toHaveAttribute("data-variant", "shared");
  });

  it("throws the query error so the route error boundary catches it", () => {
    useAdminReportMock.mockReturnValue({
      isLoading: false,
      isError: true,
      error: new Error("boom"),
    });

    expect(() => render(<AdminReportView reportId="r1" />)).toThrow("boom");
  });
});
