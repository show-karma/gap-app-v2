import { render, screen } from "@testing-library/react";
import { PublicReportViewPage } from "@/components/Pages/Community/PortfolioReports/PublicReportViewPage";
import { useIsCommunityAdmin } from "@/hooks/communities/useIsCommunityAdmin";
import {
  useAdminReportByRunDate,
  usePublishedReport,
} from "@/hooks/portfolio-reports/usePortfolioReports";

// DEV-496: /reports/:runDate is the single report URL. Public sees published;
// a community admin previews the draft at the same URL when nothing is published.
vi.mock("@/hooks/portfolio-reports/usePortfolioReports");
vi.mock("@/hooks/communities/useIsCommunityAdmin");
vi.mock("@/components/Pages/Community/PortfolioReports/PortfolioReportDocumentView", () => ({
  PortfolioReportDocumentView: ({
    report,
    bannerText,
    isAdmin,
    canExportData,
  }: {
    report: { id: string };
    bannerText?: string;
    isAdmin?: boolean;
    canExportData?: boolean;
  }) => (
    <div
      data-testid="doc-view"
      data-banner={bannerText ?? ""}
      data-admin={String(isAdmin)}
      data-can-export={String(canExportData)}
    >
      report:{report?.id}
    </div>
  ),
}));

const mockPublished = vi.mocked(usePublishedReport);
const mockAdmin = vi.mocked(useIsCommunityAdmin);
const mockDraft = vi.mocked(useAdminReportByRunDate);

const community = {
  uid: "c-1",
  details: { slug: "filecoin", name: "Filecoin" },
} as any;

const RUN_DATE = "2026-03-15";

describe("PublicReportViewPage (DEV-496 unified report URL)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPublished.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);
    mockAdmin.mockReturnValue({ isCommunityAdmin: false, isLoading: false } as any);
    mockDraft.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);
  });

  it("renders a published report as the public view, with no admin banner", () => {
    mockPublished.mockReturnValue({
      data: { id: "pub-1", publishedAt: "2026-01-01T00:00:00Z" },
      isLoading: false,
      isError: false,
    } as any);

    render(<PublicReportViewPage community={community} runDate={RUN_DATE} />);

    const doc = screen.getByTestId("doc-view");
    expect(doc).toHaveTextContent("report:pub-1");
    expect(doc).toHaveAttribute("data-banner", "");
    expect(doc).toHaveAttribute("data-admin", "false");
    // The public must never get the raw-data export.
    expect(doc).toHaveAttribute("data-can-export", "false");
  });

  it("gives a community admin the export affordance on a published report", () => {
    // Regression: export must reach admins on published reports too, where
    // `isAdmin` (draft-preview) is false. It is gated on admin status, not draft.
    mockAdmin.mockReturnValue({ isCommunityAdmin: true, isLoading: false } as any);
    mockPublished.mockReturnValue({
      data: { id: "pub-1", publishedAt: "2026-01-01T00:00:00Z" },
      isLoading: false,
      isError: false,
    } as any);

    render(<PublicReportViewPage community={community} runDate={RUN_DATE} />);

    const doc = screen.getByTestId("doc-view");
    expect(doc).toHaveAttribute("data-admin", "false");
    expect(doc).toHaveAttribute("data-can-export", "true");
  });

  it("previews the draft to a community admin, with the admin-only banner", () => {
    mockAdmin.mockReturnValue({ isCommunityAdmin: true, isLoading: false } as any);
    mockDraft.mockReturnValue({
      data: { id: "draft-1", publishedAt: null },
      isLoading: false,
    } as any);

    render(<PublicReportViewPage community={community} runDate={RUN_DATE} />);

    const doc = screen.getByTestId("doc-view");
    expect(doc).toHaveTextContent("report:draft-1");
    expect(doc).toHaveAttribute(
      "data-banner",
      "Preview mode — this draft is only visible to community admins."
    );
    expect(doc).toHaveAttribute("data-admin", "true");
    expect(doc).toHaveAttribute("data-can-export", "true");
  });

  it("shows a not-found message to a non-admin and never fetches the draft", () => {
    render(<PublicReportViewPage community={community} runDate={RUN_DATE} />);

    expect(screen.getByText(/no published report found/i)).toBeInTheDocument();
    expect(screen.queryByTestId("doc-view")).not.toBeInTheDocument();
    // The draft lookup is gated off for non-admins.
    expect(mockDraft).toHaveBeenCalledWith("filecoin", RUN_DATE, false, undefined);
  });

  it("surfaces the error state (not 'no report') when the admin draft lookup fails", () => {
    const refetchDraft = vi.fn();
    mockAdmin.mockReturnValue({ isCommunityAdmin: true, isLoading: false } as any);
    mockDraft.mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      refetch: refetchDraft,
    } as any);

    render(<PublicReportViewPage community={community} runDate={RUN_DATE} />);

    expect(screen.getByText(/failed to load the report/i)).toBeInTheDocument();
    expect(screen.queryByText(/no published report found/i)).not.toBeInTheDocument();
  });

  it("does not render a cached draft to a non-admin (selection is gated, not just the fetch)", () => {
    // Query is disabled for non-admins but React Query still returns the last
    // cached draft — the page must not surface it.
    mockDraft.mockReturnValue({
      data: { id: "stale-draft", publishedAt: null },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    render(<PublicReportViewPage community={community} runDate={RUN_DATE} />);

    expect(screen.getByText(/no published report found/i)).toBeInTheDocument();
    expect(screen.queryByTestId("doc-view")).not.toBeInTheDocument();
  });

  it("passes the config slug through so the right same-date report is fetched", () => {
    mockPublished.mockReturnValue({
      data: { id: "r-health", publishedAt: "2026-03-15T00:00:00.000Z" },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    render(
      <PublicReportViewPage
        community={community}
        runDate={RUN_DATE}
        configSlug="portfolio-health"
      />
    );

    expect(mockPublished).toHaveBeenCalledWith("filecoin", RUN_DATE, "portfolio-health");
    expect(screen.getByTestId("doc-view")).toHaveTextContent("report:r-health");
  });

  it("scopes the admin draft preview to the config in the URL", () => {
    // Two configs can have a draft on one date; the draft shown must be the
    // one the URL names, not whichever comes back first.
    mockPublished.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);
    mockAdmin.mockReturnValue({ isCommunityAdmin: true, isLoading: false } as any);
    mockDraft.mockReturnValue({
      data: { id: "draft-health", publishedAt: null },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    render(
      <PublicReportViewPage
        community={community}
        runDate={RUN_DATE}
        configSlug="portfolio-health"
      />
    );

    expect(mockDraft).toHaveBeenCalledWith("filecoin", RUN_DATE, true, "portfolio-health");
  });

  it("omits the config slug on the legacy run-date-only URL", () => {
    mockPublished.mockReturnValue({
      data: { id: "r-newest", publishedAt: "2026-03-15T00:00:00.000Z" },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    render(<PublicReportViewPage community={community} runDate={RUN_DATE} />);

    expect(mockPublished).toHaveBeenCalledWith("filecoin", RUN_DATE, undefined);
  });
});
