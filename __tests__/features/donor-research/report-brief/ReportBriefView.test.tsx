import { screen } from "@testing-library/react";
import { useDonorAdvisor } from "@/hooks/useDonorAdvisor";
import { useDonorReportStream } from "@/hooks/useDonorReportStream";
import { useDonorReport } from "@/hooks/useDonorReports";
import { ReportBriefView } from "@/src/features/donor-research/components/report-brief/ReportBriefView";
import { renderWithProviders } from "../../../utils/render";

vi.mock("@/hooks/useDonorAdvisor", () => ({ useDonorAdvisor: vi.fn() }));
vi.mock("@/hooks/useDonorReportStream", () => ({ useDonorReportStream: vi.fn() }));
vi.mock("@/hooks/useDonorReports", () => ({ useDonorReport: vi.fn() }));
vi.mock("@/src/features/donor-research/components/report-brief/ReportBrief", () => ({
  ReportBrief: () => <div>Report brief content</div>,
}));

const mockUseDonorAdvisor = vi.mocked(useDonorAdvisor);
const mockUseDonorReport = vi.mocked(useDonorReport);
const mockUseDonorReportStream = vi.mocked(useDonorReportStream);

beforeEach(() => {
  vi.clearAllMocks();
  mockUseDonorAdvisor.mockReturnValue({
    data: { id: "advisor-1" },
  } as unknown as ReturnType<typeof useDonorAdvisor>);
  mockUseDonorReport.mockReturnValue({
    data: { advisorId: "advisor-1", status: "fast_complete" },
    isLoading: false,
    isError: false,
  } as unknown as ReturnType<typeof useDonorReport>);
  mockUseDonorReportStream.mockReturnValue({} as ReturnType<typeof useDonorReportStream>);
});

describe("ReportBriefView", () => {
  it("renders report content without a duplicate page-level breadcrumb", () => {
    renderWithProviders(<ReportBriefView reportId="fb95f6f5-1630-4f72-a8b9-d052030d9c3d" />);

    expect(screen.getByText("Report brief content")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "breadcrumb" })).not.toBeInTheDocument();
  });
});
