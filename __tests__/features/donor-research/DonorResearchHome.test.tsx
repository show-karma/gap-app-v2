import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useDonorHandles } from "@/hooks/useDonorHandles";
import { useDonorReports } from "@/hooks/useDonorReports";
import { DonorResearchHome } from "@/src/features/donor-research/components/common/DonorResearchHome";
import type { ResearchReportListItem } from "@/types/donor-research";
import { renderWithProviders } from "../../utils/render";

vi.mock("next/navigation", () => ({
  useParams: () => ({}),
}));

vi.mock("@/hooks/useDonorHandles", () => ({ useDonorHandles: vi.fn() }));
vi.mock("@/hooks/useDonorReports", () => ({ useDonorReports: vi.fn() }));

const mockUseDonorHandles = vi.mocked(useDonorHandles);
const mockUseDonorReports = vi.mocked(useDonorReports);

const REPORTS: ResearchReportListItem[] = [
  {
    id: "report-1",
    donorHandleId: "handle-1",
    donorHandleLabel: "Smith Family",
    criteriaId: "criteria-1",
    criteriaSummary: "Climate resilience in the Pacific Northwest",
    mode: "fast",
    status: "fast_complete",
    hasShareToken: true,
    shareTokenExpiresAt: null,
    createdAt: "2026-07-16T12:00:00.000Z",
    fastCompletedAt: "2026-07-16T12:05:00.000Z",
    completedAt: null,
    errorMessage: null,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperties(HTMLElement.prototype, {
    hasPointerCapture: { configurable: true, value: () => false },
    releasePointerCapture: { configurable: true, value: () => undefined },
    scrollIntoView: { configurable: true, value: () => undefined },
    setPointerCapture: { configurable: true, value: () => undefined },
  });
  mockUseDonorReports.mockReturnValue({
    data: { items: REPORTS, limit: 25, offset: 0 },
    isLoading: false,
    isError: false,
  } as unknown as ReturnType<typeof useDonorReports>);
  mockUseDonorHandles.mockReturnValue({
    data: {
      items: [
        {
          id: "handle-1",
          advisorId: "advisor-1",
          opaqueLabel: "Smith Family",
          notes: null,
          createdAt: "2026-07-16T12:00:00.000Z",
          updatedAt: "2026-07-16T12:00:00.000Z",
        },
      ],
      limit: 200,
      offset: 0,
    },
    isLoading: false,
    isError: false,
    isSuccess: true,
  } as unknown as ReturnType<typeof useDonorHandles>);
});

describe("DonorResearchHome", () => {
  it("renders funding-platform-style overview cards with restrained icon chips", () => {
    renderWithProviders(<DonorResearchHome />);

    const overview = screen.getByLabelText("Report overview");
    expect(within(overview).getByText("Reports")).toBeVisible();
    expect(within(overview).getByText("Completed")).toBeVisible();
    expect(within(overview).getByText("Shared")).toBeVisible();
    expect(within(overview).getByText("Donors")).toBeVisible();
    expect(overview.querySelectorAll(":scope > div")).toHaveLength(4);
    expect(overview.querySelectorAll("svg")).toHaveLength(4);
    expect(overview.querySelector(".lucide-file-text")).toBeInTheDocument();
    expect(overview.querySelector(".lucide-send")).toBeInTheDocument();
    expect(overview.querySelector(".lucide-users")).toBeInTheDocument();
  });

  it("makes the report title primary and shows a user icon beside the persona", () => {
    renderWithProviders(<DonorResearchHome />);

    const reportLink = screen.getByRole("link", {
      name: /Climate resilience in the Pacific Northwest/i,
    });
    expect(reportLink).toHaveClass("grid", "min-h-[88px]", "rounded-sf-tile");
    expect(reportLink.querySelector(".lucide-file-text")).toBeInTheDocument();

    const persona = within(reportLink).getByText("Smith Family").parentElement;
    expect(persona?.querySelector(".lucide-user-round")).toBeInTheDocument();
    expect(within(reportLink).getAllByText("Fast complete")).toHaveLength(2);
    expect(within(reportLink).queryByText("Fast")).not.toBeInTheDocument();
    expect(within(reportLink).getByText("Shared")).toBeVisible();
  });

  it("filters reports by user-facing completion group through the reports query", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DonorResearchHome />);

    await user.click(screen.getByRole("combobox", { name: "Filter reports by status" }));
    expect(screen.queryByRole("option", { name: "Fast complete" })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "In progress" })).toBeVisible();
    await user.click(await screen.findByRole("option", { name: "Complete" }));

    expect(mockUseDonorReports).toHaveBeenCalledWith({
      limit: 25,
      donorHandleId: undefined,
      status: "complete",
    });
  });
});
