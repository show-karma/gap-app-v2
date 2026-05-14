import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PortfolioReportEditorPage } from "@/components/Pages/Admin/PortfolioReports/PortfolioReportEditorPage";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import {
  usePortfolioReport,
  usePublishReport,
  useRegenerateReport,
  useUnpublishReport,
  useUpdateReportContent,
} from "@/hooks/portfolio-reports/usePortfolioReports";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

vi.mock("@/components/Pages/Community/PortfolioReports/HtmlReportFrame", () => ({
  HtmlReportFrame: ({ html }: { html?: string }) => <div data-testid="report-frame">{html}</div>,
}));

vi.mock("@/services/portfolio-reports.service", () => ({
  downloadReportPdf: vi.fn(),
}));

vi.mock("@/hooks/communities/useCommunityAdminAccess");
vi.mock("@/hooks/portfolio-reports/usePortfolioReports");

const mockUseCommunityAdminAccess = vi.mocked(useCommunityAdminAccess);
const mockUsePortfolioReport = vi.mocked(usePortfolioReport);
const mockUsePublishReport = vi.mocked(usePublishReport);
const mockUseUnpublishReport = vi.mocked(useUnpublishReport);
const mockUseRegenerateReport = vi.mocked(useRegenerateReport);
const mockUseUpdateReportContent = vi.mocked(useUpdateReportContent);

const community = {
  uid: "community-1",
  details: { slug: "filecoin", name: "Filecoin" },
} as any;

const baseReport = {
  id: "report-1",
  reportConfigId: "config-1",
  communityId: "community-1",
  runDate: "2026-03-15",
  status: "draft",
  content: "<p>Server content</p>",
  dataSnapshot: {},
  modelId: "gpt-4.1",
  tokenUsage: null,
  generatedAt: "2026-04-01T00:00:00.000Z",
  generationError: null,
  publishedAt: null,
  publishedBy: null,
  createdAt: "2026-04-01T00:00:00.000Z",
  updatedAt: "2026-04-01T00:00:00.000Z",
};

describe("PortfolioReportEditorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCommunityAdminAccess.mockReturnValue({
      hasAccess: true,
      isLoading: false,
    } as any);
    mockUsePublishReport.mockReturnValue({ isPending: false, mutateAsync: vi.fn() } as any);
    mockUseUnpublishReport.mockReturnValue({ isPending: false, mutateAsync: vi.fn() } as any);
    mockUseRegenerateReport.mockReturnValue({ isPending: false, mutateAsync: vi.fn() } as any);
    mockUseUpdateReportContent.mockReturnValue({ isPending: false, mutateAsync: vi.fn() } as any);
  });

  describe("edit textarea seeding", () => {
    it("should_seed_textarea_with_report_content_when_dialog_opens", async () => {
      const user = userEvent.setup();
      mockUsePortfolioReport.mockReturnValue({ data: baseReport, isLoading: false } as any);

      render(<PortfolioReportEditorPage community={community} reportId="report-1" />);

      await user.click(screen.getByRole("button", { name: /^edit$/i }));

      const textarea = screen.getByLabelText(/report html content/i) as HTMLTextAreaElement;
      expect(textarea.value).toBe("<p>Server content</p>");
    });

    it("should_not_reset_textarea_when_report_content_changes_while_dialog_is_open", async () => {
      const user = userEvent.setup();
      mockUsePortfolioReport.mockReturnValue({ data: baseReport, isLoading: false } as any);

      const { rerender } = render(
        <PortfolioReportEditorPage community={community} reportId="report-1" />
      );

      await user.click(screen.getByRole("button", { name: /^edit$/i }));
      const textarea = screen.getByLabelText(/report html content/i) as HTMLTextAreaElement;

      await user.clear(textarea);
      await user.type(textarea, "<p>My in-progress edits</p>");
      expect(textarea.value).toBe("<p>My in-progress edits</p>");

      // Simulate a background refetch / cache update returning different
      // server content (e.g. another admin saved, or refetchOnWindowFocus).
      mockUsePortfolioReport.mockReturnValue({
        data: { ...baseReport, content: "<p>Different server content</p>" },
        isLoading: false,
      } as any);
      rerender(<PortfolioReportEditorPage community={community} reportId="report-1" />);

      expect(textarea.value).toBe("<p>My in-progress edits</p>");
    });

    it("should_reseed_textarea_with_latest_content_when_dialog_reopens", async () => {
      const user = userEvent.setup();
      mockUsePortfolioReport.mockReturnValue({ data: baseReport, isLoading: false } as any);

      const { rerender } = render(
        <PortfolioReportEditorPage community={community} reportId="report-1" />
      );

      await user.click(screen.getByRole("button", { name: /^edit$/i }));
      await user.click(screen.getByRole("button", { name: /^cancel$/i }));

      mockUsePortfolioReport.mockReturnValue({
        data: { ...baseReport, content: "<p>Updated server content</p>" },
        isLoading: false,
      } as any);
      rerender(<PortfolioReportEditorPage community={community} reportId="report-1" />);

      await user.click(screen.getByRole("button", { name: /^edit$/i }));

      const textarea = screen.getByLabelText(/report html content/i) as HTMLTextAreaElement;
      expect(textarea.value).toBe("<p>Updated server content</p>");
    });
  });

  describe("regenerate dialog", () => {
    it("should_show_standard_overwrite_warning_when_no_unsaved_edits_exist", async () => {
      const user = userEvent.setup();
      mockUsePortfolioReport.mockReturnValue({ data: baseReport, isLoading: false } as any);

      render(<PortfolioReportEditorPage community={community} reportId="report-1" />);

      await user.click(screen.getByRole("button", { name: /^regenerate$/i }));

      expect(screen.getByRole("heading", { name: /regenerate report/i })).toBeInTheDocument();
      expect(screen.getByText(/spends llm tokens/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^continue$/i })).toBeInTheDocument();
    });

    it("should_show_unsaved_edits_warning_when_editDraft_differs_from_server_content", async () => {
      const user = userEvent.setup();
      mockUsePortfolioReport.mockReturnValue({ data: baseReport, isLoading: false } as any);

      render(<PortfolioReportEditorPage community={community} reportId="report-1" />);

      await user.click(screen.getByRole("button", { name: /^edit$/i }));
      const textarea = screen.getByLabelText(/report html content/i) as HTMLTextAreaElement;
      await user.clear(textarea);
      await user.type(textarea, "<p>Unsaved local edits</p>");
      await user.click(screen.getByRole("button", { name: /^cancel$/i }));

      await user.click(screen.getByRole("button", { name: /^regenerate$/i }));

      expect(screen.getByRole("heading", { name: /discard unsaved edits/i })).toBeInTheDocument();
      expect(screen.getByText(/your unsaved edits will be lost/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /discard.*regenerate/i })).toBeInTheDocument();
    });

    it("should_call_regenerate_mutation_when_discard_and_regenerate_is_clicked", async () => {
      const user = userEvent.setup();
      const mutateAsync = vi.fn().mockResolvedValue(baseReport);
      mockUseRegenerateReport.mockReturnValue({ isPending: false, mutateAsync } as any);
      mockUsePortfolioReport.mockReturnValue({ data: baseReport, isLoading: false } as any);

      render(<PortfolioReportEditorPage community={community} reportId="report-1" />);

      await user.click(screen.getByRole("button", { name: /^edit$/i }));
      const textarea = screen.getByLabelText(/report html content/i) as HTMLTextAreaElement;
      await user.clear(textarea);
      await user.type(textarea, "<p>Unsaved</p>");
      await user.click(screen.getByRole("button", { name: /^cancel$/i }));

      await user.click(screen.getByRole("button", { name: /^regenerate$/i }));
      await user.click(screen.getByRole("button", { name: /discard.*regenerate/i }));

      expect(mutateAsync).toHaveBeenCalledWith("report-1");
    });

    it("should_not_treat_initial_empty_draft_as_unsaved_edits", async () => {
      const user = userEvent.setup();
      mockUsePortfolioReport.mockReturnValue({ data: baseReport, isLoading: false } as any);

      render(<PortfolioReportEditorPage community={community} reportId="report-1" />);

      await user.click(screen.getByRole("button", { name: /^regenerate$/i }));

      expect(
        screen.queryByRole("heading", { name: /discard unsaved edits/i })
      ).not.toBeInTheDocument();
    });

    it("should_not_show_unsaved_edits_warning_after_a_successful_save", async () => {
      // Guards the brief window between save success and the React Query
      // cache update propagating the saved content back into `report.content`.
      // Without clearing editDraft on save, hasUnsavedEdits would be falsely
      // true for that window and the dialog would warn about edits the user
      // just saved.
      const user = userEvent.setup();
      const updateMutate = vi.fn().mockResolvedValue(baseReport);
      mockUseUpdateReportContent.mockReturnValue({
        isPending: false,
        mutateAsync: updateMutate,
      } as any);
      mockUsePortfolioReport.mockReturnValue({ data: baseReport, isLoading: false } as any);

      render(<PortfolioReportEditorPage community={community} reportId="report-1" />);

      await user.click(screen.getByRole("button", { name: /^edit$/i }));
      const textarea = screen.getByLabelText(/report html content/i) as HTMLTextAreaElement;
      await user.clear(textarea);
      await user.type(textarea, "<p>Edited and saved</p>");
      await user.click(screen.getByRole("button", { name: /^save$/i }));

      await user.click(screen.getByRole("button", { name: /^regenerate$/i }));

      expect(
        screen.queryByRole("heading", { name: /discard unsaved edits/i })
      ).not.toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /^regenerate report/i })).toBeInTheDocument();
    });
  });
});
