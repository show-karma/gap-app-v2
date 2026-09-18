import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReportConfigPage } from "@/components/Pages/Admin/PortfolioReports/ReportConfigPage";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import {
  useCreateReportConfig,
  useDeleteReportConfig,
  useReportConfigs,
  useUpdateReportConfig,
} from "@/hooks/portfolio-reports/usePortfolioReports";
import { useAvailableAIModels } from "@/hooks/useAvailableAIModels";
import type { ReportConfig } from "@/types/portfolio-report";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

vi.mock("@/components/Pages/Admin/PortfolioReports/ChartSectionPicker", () => ({
  ChartSectionPicker: () => <div data-testid="chart-section-picker" />,
}));
vi.mock("@/components/Pages/ProgramRegistry/SearchDropdown", () => ({
  SearchDropdown: () => <div data-testid="search-dropdown" />,
}));

vi.mock("@/hooks/communities/useCommunityAdminAccess");
vi.mock("@/hooks/portfolio-reports/usePortfolioReports");
vi.mock("@/hooks/useAvailableAIModels");

const mockUseCommunityAdminAccess = vi.mocked(useCommunityAdminAccess);
const mockUseReportConfigs = vi.mocked(useReportConfigs);
const mockUseCreateReportConfig = vi.mocked(useCreateReportConfig);
const mockUseUpdateReportConfig = vi.mocked(useUpdateReportConfig);
const mockUseDeleteReportConfig = vi.mocked(useDeleteReportConfig);
const mockUseAvailableAIModels = vi.mocked(useAvailableAIModels);

const community = {
  uid: "community-1",
  details: { slug: "filecoin", name: "Filecoin" },
} as never;

function configFixture(overrides: Partial<ReportConfig> = {}): ReportConfig {
  return {
    id: "config-1",
    communityId: "community-1",
    programIds: ["prog-1"],
    name: "Monthly Pods Report",
    modelId: "gpt-4.1",
    prompt: "Summarise the last 30 days.",
    chartIndicatorIds: [],
    schedule: {
      intervalUnit: "months",
      intervalCount: 1,
      startDate: "2026-01-01",
      ends: { kind: "never" },
    },
    isActive: true,
    source: "karma",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdBy: "user-1",
    updatedBy: "user-1",
    ...overrides,
  };
}

describe("ReportConfigPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCommunityAdminAccess.mockReturnValue({ hasAccess: true, isLoading: false } as never);
    mockUseCreateReportConfig.mockReturnValue({ isPending: false, mutateAsync: vi.fn() } as never);
    mockUseUpdateReportConfig.mockReturnValue({ isPending: false, mutateAsync: vi.fn() } as never);
    mockUseDeleteReportConfig.mockReturnValue({ isPending: false, mutateAsync: vi.fn() } as never);
    mockUseAvailableAIModels.mockReturnValue({ data: ["gpt-4.1"], isLoading: false } as never);
  });

  describe("external configs", () => {
    it("shows the prompt read-only with an explanatory note", async () => {
      const user = userEvent.setup();
      mockUseReportConfigs.mockReturnValue({
        data: [configFixture({ source: "external", prompt: "Agent-authored prompt" })],
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as never);

      render(<ReportConfigPage community={community} grantPrograms={[]} />);

      await user.click(screen.getByRole("button", { name: /^edit$/i }));

      const prompt = screen.getByLabelText(/report prompt/i) as HTMLTextAreaElement;
      expect(prompt).toHaveAttribute("readonly");
      expect(prompt.value).toBe("Agent-authored prompt");
      expect(
        screen.getByText(/this prompt was saved from an external agent\. karma does not run it/i)
      ).toBeInTheDocument();
      // Other fields remain editable.
      expect(screen.getByLabelText(/report name/i)).not.toHaveAttribute("readonly");
    });

    it("keeps the prompt editable for karma configs and the create flow", async () => {
      const user = userEvent.setup();
      mockUseReportConfigs.mockReturnValue({
        data: [configFixture({ source: "karma" })],
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as never);

      render(<ReportConfigPage community={community} grantPrograms={[]} />);

      await user.click(screen.getByRole("button", { name: /^edit$/i }));
      expect(screen.getByLabelText(/report prompt/i)).not.toHaveAttribute("readonly");
      expect(screen.queryByText(/saved from an external agent/i)).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /close form/i }));
      await user.click(screen.getByRole("button", { name: /new report/i }));
      expect(screen.getByLabelText(/report prompt/i)).not.toHaveAttribute("readonly");
      expect(screen.queryByText(/saved from an external agent/i)).not.toBeInTheDocument();
    });
  });
});
