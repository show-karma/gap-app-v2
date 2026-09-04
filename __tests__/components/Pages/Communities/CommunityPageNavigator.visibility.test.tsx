import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { CommunityPageNavigator } from "@/components/Pages/Communities/CommunityPageNavigator";
import { useCommunityDetails } from "@/hooks/communities/useCommunityDetails";
import { usePublishedReports } from "@/hooks/portfolio-reports/usePortfolioReports";
import { useCommunityPrograms } from "@/hooks/usePrograms";
import { useWhitelabel } from "@/utilities/whitelabel-context";

// Mock hooks
vi.mock("@/hooks/communities/useCommunityDetails");
vi.mock("@/hooks/portfolio-reports/usePortfolioReports");
vi.mock("@/hooks/usePrograms");
vi.mock("@/utilities/whitelabel-context");

// Mock next/navigation
const mockUseParams = vi.fn();
const mockUsePathname = vi.fn();
const mockUseSearchParams = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => mockUseParams(),
  usePathname: () => mockUsePathname(),
  useSearchParams: () => mockUseSearchParams(),
}));

// Mock PAGES utility
vi.mock("@/utilities/pages", () => ({
  PAGES: {
    COMMUNITY: {
      FUNDING_OPPORTUNITIES: (id: string) => `/community/${id}/funding-opportunities`,
      ALL_GRANTS: (id: string) => `/community/${id}`,
      PROJECTS: (id: string) => `/community/${id}/projects`,
      UPDATES: (id: string) => `/community/${id}/updates`,
      IMPACT: (id: string) => `/community/${id}/impact`,
      REPORTS: (id: string) => `/community/${id}/reports`,
      FINANCIALS: (id: string) => `/community/${id}/financials`,
      BROWSE_APPLICATIONS: (id: string) => `/community/${id}/browse-applications`,
    },
  },
}));

// Mock community-flags
vi.mock("@/utilities/community-flags", () => ({
  FINANCIALS_ENABLED_COMMUNITIES: ["filecoin"],
  EXPLORER_NAV_OVERRIDES: {
    filecoin: {
      hiddenTabs: ["community-projects", "reports", "financials"],
      tabLabels: { "browse-applications": "Browse Projects" },
      tabPaths: { "browse-applications": "/browse-projects" },
    },
  },
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  ChartLine: (props: any) => <svg data-testid="chart-line-icon" {...props} />,
  DollarSign: (props: any) => <svg data-testid="dollar-sign-icon" {...props} />,
  FileSearch: (props: any) => <svg data-testid="file-search-icon" {...props} />,
  FileText: (props: any) => <svg data-testid="file-text-icon" {...props} />,
  LandPlot: (props: any) => <svg data-testid="land-plot-icon" {...props} />,
  SquareUser: (props: any) => <svg data-testid="square-user-icon" {...props} />,
  Wallet: (props: any) => <svg data-testid="wallet-icon" {...props} />,
}));

const mockUseCommunityDetails = useCommunityDetails as vi.MockedFunction<
  typeof useCommunityDetails
>;
const mockUsePublishedReports = usePublishedReports as vi.MockedFunction<
  typeof usePublishedReports
>;
const mockUseCommunityPrograms = useCommunityPrograms as vi.MockedFunction<
  typeof useCommunityPrograms
>;
const mockUseWhitelabel = useWhitelabel as vi.MockedFunction<typeof useWhitelabel>;

describe("CommunityPageNavigator", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  /**
   * Labels of every tab currently carrying the active style. `border-b-gray-900`
   * is the discriminator: the inactive style also sets `border-b-4`, but
   * transparent.
   */
  const activeTabLabels = () =>
    screen
      .getAllByRole("link")
      .filter((link) => link.className.includes("border-b-gray-900"))
      .map((link) => link.textContent?.trim() ?? "");

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();

    // JSDOM doesn't provide scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();

    // Default mocks
    mockUseWhitelabel.mockReturnValue({
      isWhitelabel: false,
      communitySlug: null,
      config: null,
    } as any);
    mockUseParams.mockReturnValue({ communityId: "test-community" });
    mockUsePathname.mockReturnValue("/community/test-community");
    mockUseSearchParams.mockReturnValue({
      get: vi.fn(() => null),
    });
    mockUseCommunityDetails.mockReturnValue({
      data: {
        uid: "0x1234567890123456789012345678901234567890",
        details: {
          name: "Test Community",
          slug: "test-community",
        },
      },
      isLoading: false,
    } as any);
    mockUsePublishedReports.mockReturnValue({
      data: [{ id: "report-1", reportMonth: "2026-03", markdown: "", status: "published" }],
      isLoading: false,
    } as any);
    mockUseCommunityPrograms.mockReturnValue({
      data: [{ programId: "program-1", metadata: { title: "Program One" } }],
      isLoading: false,
    } as any);
  });

  afterEach(() => {
    queryClient.clear();
  });

  // The overrides exist to drop tabs the tenant's own navbar already carries.
  // That navbar only exists on the whitelabel host, so the overrides are gated
  // on it: on karmahq.org/community/filecoin this bar is the only way into
  // those routes, and hiding them there would strand two live pages.
  describe("Explorer Nav Overrides (whitelabel hosts only)", () => {
    const renderFilecoin = ({
      pathname = "/community/filecoin",
      isWhitelabel = true,
    }: {
      pathname?: string;
      isWhitelabel?: boolean;
    } = {}) => {
      mockUseWhitelabel.mockReturnValue({
        isWhitelabel,
        communitySlug: isWhitelabel ? "filecoin" : null,
        config: null,
      } as any);
      mockUseParams.mockReturnValue({ communityId: "filecoin" });
      mockUsePathname.mockReturnValue(pathname);
      render(<CommunityPageNavigator communityId={mockUseParams().communityId} />, { wrapper });
    };

    describe("on a whitelabel host", () => {
      it("should hide the tabs listed in hiddenTabs", () => {
        renderFilecoin();

        expect(screen.queryByText("View funded projects")).not.toBeInTheDocument();
        expect(screen.queryByText("Reports")).not.toBeInTheDocument();
        expect(screen.queryByText("Commitments & Disbursements")).not.toBeInTheDocument();
      });

      it("should render exactly the surviving tabs, in order", () => {
        renderFilecoin();

        expect(screen.getAllByRole("link").map((link) => link.textContent?.trim())).toEqual([
          "Funding opportunities",
          "Browse Projects",
          "Milestone updates",
          "Impact",
        ]);
      });

      it("should apply the override label to the browse applications tab", () => {
        renderFilecoin();

        expect(screen.getByText("Browse Projects")).toBeInTheDocument();
        expect(screen.queryByText("Browse applications")).not.toBeInTheDocument();
      });

      // A renamed tab that lands on /browse-applications contradicts itself in
      // the address bar, and that URL is what gets shared. The tenant's own
      // name for the listing is the URL too — the whitelabel rewrite resolves
      // /browse-projects back onto the same route (WHITELABEL_ROUTE_ALIASES).
      it("should send the renamed tab to the tenant's own URL for the listing", () => {
        renderFilecoin();

        // Bare path: the whitelabel-aware Link strips the /community/<slug>
        // prefix on the tenant host, so the tab costs no redirect hop.
        expect(screen.getByText("Browse Projects").closest("a")).toHaveAttribute(
          "href",
          "/browse-projects"
        );
      });

      it("should keep the renamed tab highlighted on the aliased path", () => {
        renderFilecoin({ pathname: "/browse-projects" });

        expect(activeTabLabels()).toEqual(["Browse Projects"]);
      });

      it("should keep the renamed tab highlighted on the underlying path", () => {
        renderFilecoin({ pathname: "/browse-applications" });

        expect(activeTabLabels()).toEqual(["Browse Projects"]);
      });

      it("should skip the published-reports query when the reports tab is hidden", () => {
        renderFilecoin();

        expect(mockUsePublishedReports).toHaveBeenCalledWith("");
      });
    });

    describe("on karmahq.org (no tenant navbar to carry the destinations)", () => {
      it("should keep every tab the overrides would have hidden", () => {
        renderFilecoin({ isWhitelabel: false });

        expect(screen.getByText("View funded projects")).toBeInTheDocument();
        expect(screen.getByText("Reports")).toBeInTheDocument();
        expect(screen.getByText("Commitments & Disbursements")).toBeInTheDocument();
      });

      it("should keep the default browse-applications label", () => {
        renderFilecoin({ isWhitelabel: false });

        expect(screen.getByText("Browse applications")).toBeInTheDocument();
        expect(screen.queryByText("Browse Projects")).not.toBeInTheDocument();
      });

      // The alias only resolves on a tenant host, so linking it from karmahq.org
      // would be a 404 with a tab bar around it.
      it("should keep the default browse-applications destination", () => {
        renderFilecoin({ isWhitelabel: false });

        expect(screen.getByText("Browse applications").closest("a")).toHaveAttribute(
          "href",
          "/community/filecoin/browse-applications"
        );
      });

      it("should still run the published-reports query", () => {
        renderFilecoin({ isWhitelabel: false });

        // The canonical slug from community details, never the suppressing "".
        expect(mockUsePublishedReports).not.toHaveBeenCalledWith("");
      });
    });

    it("should leave a community without an override untouched on either host", () => {
      const defaultTabs = [
        "Funding opportunities",
        "Browse applications",
        "View funded projects",
        "Milestone updates",
        "Impact",
        "Reports",
      ];

      const { unmount } = render(
        <CommunityPageNavigator communityId={mockUseParams().communityId} />,
        { wrapper }
      );
      expect(screen.getAllByRole("link").map((link) => link.textContent?.trim())).toEqual(
        defaultTabs
      );
      unmount();

      mockUseWhitelabel.mockReturnValue({
        isWhitelabel: true,
        communitySlug: "test-community",
        config: null,
      } as any);
      render(<CommunityPageNavigator communityId={mockUseParams().communityId} />, { wrapper });
      expect(screen.getAllByRole("link").map((link) => link.textContent?.trim())).toEqual(
        defaultTabs
      );
    });
  });

  describe("Commitments & Disbursements (financials) Tab Visibility", () => {
    const renderFilecoinOnKarma = (pathname = "/community/filecoin") => {
      mockUseParams.mockReturnValue({ communityId: "filecoin" });
      mockUsePathname.mockReturnValue(pathname);
      render(<CommunityPageNavigator communityId={mockUseParams().communityId} />, { wrapper });
    };

    it("should hide the tab when the community is not in FINANCIALS_ENABLED_COMMUNITIES", () => {
      render(<CommunityPageNavigator communityId={mockUseParams().communityId} />, { wrapper });

      expect(screen.queryByText("Commitments & Disbursements")).not.toBeInTheDocument();
      expect(screen.queryByTestId("wallet-icon")).not.toBeInTheDocument();
    });

    it("should hide the tab when programs count is 0 even for an enabled community", () => {
      mockUseCommunityPrograms.mockReturnValue({ data: [], isLoading: false } as any);

      renderFilecoinOnKarma();

      expect(screen.queryByText("Commitments & Disbursements")).not.toBeInTheDocument();
      expect(screen.queryByTestId("wallet-icon")).not.toBeInTheDocument();
    });

    it("should hide the tab while programs are loading (undefined !== empty)", () => {
      mockUseCommunityPrograms.mockReturnValue({ data: undefined, isLoading: true } as any);

      renderFilecoinOnKarma();

      expect(screen.queryByText("Commitments & Disbursements")).not.toBeInTheDocument();
    });

    it("should show the tab, with its New! badge, when enabled and programs exist", () => {
      renderFilecoinOnKarma();

      expect(screen.getByText("Commitments & Disbursements")).toBeInTheDocument();
      expect(screen.getByTestId("wallet-icon")).toBeInTheDocument();
      expect(screen.getByText("New!")).toBeInTheDocument();
    });

    it("should render the tab link with the correct href", () => {
      renderFilecoinOnKarma();

      expect(screen.getByText("Commitments & Disbursements").closest("a")).toHaveAttribute(
        "href",
        "/community/filecoin/financials"
      );
    });

    it("should append programId to the tab link when present", () => {
      mockUseSearchParams.mockReturnValue({
        get: (key: string) => (key === "programId" ? "program-123" : null),
      });

      renderFilecoinOnKarma();

      expect(screen.getByText("Commitments & Disbursements").closest("a")).toHaveAttribute(
        "href",
        "/community/filecoin/financials?programId=program-123"
      );
    });

    it("should apply active styles on the financials page", () => {
      renderFilecoinOnKarma("/community/filecoin/financials");

      const link = screen.getByText("Commitments & Disbursements").closest("a");
      expect(link?.className).toContain("text-gray-900");
      expect(link?.className).toContain("border-b-4");
      expect(link?.className).toContain("border-b-gray-900");
    });

    it("should not mark community projects as active on the financials page", () => {
      renderFilecoinOnKarma("/community/filecoin/financials");

      const link = screen.getByText("View funded projects").closest("a");
      expect(link?.className).toContain("text-gray-500");
    });
  });

  describe("No Active Tab", () => {
    // Highlighting a tab the reader is not on is worse than highlighting none:
    // on a whitelabel filecoin host /projects is hidden, so its own URL matches
    // nothing — the bar must stay unhighlighted rather than claim another tab.
    it.each(["/community/filecoin", "/community/filecoin/projects"])(
      "should highlight nothing on %s, where no visible tab matches",
      (pathname) => {
        mockUseWhitelabel.mockReturnValue({
          isWhitelabel: true,
          communitySlug: "filecoin",
          config: null,
        } as any);
        mockUseParams.mockReturnValue({ communityId: "filecoin" });
        mockUsePathname.mockReturnValue(pathname);

        render(<CommunityPageNavigator communityId={mockUseParams().communityId} />, { wrapper });

        expect(activeTabLabels()).toEqual([]);
      }
    );

    it("should still honour a real match on an overridden community", () => {
      mockUseWhitelabel.mockReturnValue({
        isWhitelabel: true,
        communitySlug: "filecoin",
        config: null,
      } as any);
      mockUseParams.mockReturnValue({ communityId: "filecoin" });
      mockUsePathname.mockReturnValue("/community/filecoin/impact");

      render(<CommunityPageNavigator communityId={mockUseParams().communityId} />, { wrapper });

      expect(activeTabLabels()).toEqual(["Impact"]);
    });
  });

  describe("isActive segment matching (community slugs that look like tabs)", () => {
    const renderSlug = (slug: string, pathname: string) => {
      mockUseParams.mockReturnValue({ communityId: slug });
      mockUsePathname.mockReturnValue(pathname);
      mockUseCommunityDetails.mockReturnValue({
        data: { uid: "0xabc", details: { name: "Reports DAO", slug } },
        isLoading: false,
      } as any);
      render(<CommunityPageNavigator communityId={mockUseParams().communityId} />, { wrapper });
    };

    // The pre-move matcher was `pathname.includes("/reports")`, so
    // "/community/reports-dao" lit up the Reports tab on every page of that
    // community. Matching the resolved sub-segment instead is what fixes it.
    it.each(["reports-dao", "weekly-reports-dao", "impact-collective"])(
      "does not light up a tab from the community slug %s",
      (slug) => {
        renderSlug(slug, `/community/${slug}/updates`);

        expect(activeTabLabels()).toEqual(["Milestone updates"]);
      }
    );

    it("marks funded projects active on the root of a slug containing a tab name", () => {
      renderSlug("weekly-reports-dao", "/community/weekly-reports-dao");

      expect(activeTabLabels()).toEqual(["View funded projects"]);
    });

    it("still marks Reports active on the real reports route of such a community", () => {
      renderSlug("weekly-reports-dao", "/community/weekly-reports-dao/reports");

      expect(activeTabLabels()).toEqual(["Reports"]);
    });
  });

  describe("Reports Tab Visibility", () => {
    it("should hide reports tab when there are no published reports", () => {
      mockUsePublishedReports.mockReturnValue({
        data: [],
        isLoading: false,
      } as any);

      render(<CommunityPageNavigator communityId={mockUseParams().communityId} />, { wrapper });

      expect(screen.queryByText("Reports")).not.toBeInTheDocument();
      expect(screen.queryByTestId("file-text-icon")).not.toBeInTheDocument();
    });

    it("should show reports tab when published reports exist", () => {
      render(<CommunityPageNavigator communityId={mockUseParams().communityId} />, { wrapper });

      expect(screen.getByText("Reports")).toBeInTheDocument();
      expect(screen.getByTestId("file-text-icon")).toBeInTheDocument();
    });

    it("should hide reports tab while reports are loading", () => {
      mockUsePublishedReports.mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any);

      render(<CommunityPageNavigator communityId={mockUseParams().communityId} />, { wrapper });

      expect(screen.queryByText("Reports")).not.toBeInTheDocument();
    });

    it("should append programId to reports link when present", () => {
      mockUseSearchParams.mockReturnValue({
        get: (key: string) => (key === "programId" ? "program-123" : null),
      });

      render(<CommunityPageNavigator communityId={mockUseParams().communityId} />, { wrapper });

      const reportsLink = screen.getByText("Reports").closest("a");
      expect(reportsLink).toHaveAttribute(
        "href",
        "/community/test-community/reports?programId=program-123"
      );
    });

    it("should call usePublishedReports with the canonical slug from community details, not the URL param", () => {
      // URL param differs from canonical slug (e.g., legacy redirect or address-based access)
      mockUseParams.mockReturnValue({ communityId: "0xabc" });
      mockUsePathname.mockReturnValue("/community/0xabc");
      mockUseCommunityDetails.mockReturnValue({
        data: {
          uid: "0xabc",
          details: { name: "Test Community", slug: "test-community" },
        },
        isLoading: false,
      } as any);

      render(<CommunityPageNavigator communityId={mockUseParams().communityId} />, { wrapper });

      // Hook must receive the canonical slug, never the URL param
      expect(mockUsePublishedReports).toHaveBeenCalledWith("test-community");
      expect(mockUsePublishedReports).not.toHaveBeenCalledWith("0xabc");
    });

    it("should call usePublishedReports with empty string while community details are still loading", () => {
      // Community hasn't loaded yet — slug is unavailable
      mockUseCommunityDetails.mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any);

      render(<CommunityPageNavigator communityId={mockUseParams().communityId} />, { wrapper });

      // Empty string disables the query via the hook's `enabled: Boolean(slug)` guard,
      // preventing a wasted request with the URL param before the slug is known
      expect(mockUsePublishedReports).toHaveBeenCalledWith("");
    });

    it("should call usePublishedReports with empty string on admin pages to suppress the query", () => {
      mockUsePathname.mockReturnValue("/community/test-community/manage");

      render(<CommunityPageNavigator communityId={mockUseParams().communityId} />, { wrapper });

      expect(mockUsePublishedReports).toHaveBeenCalledWith("");
    });
  });

  describe("Browse Applications Tab Visibility", () => {
    it("should show browse applications tab when programs exist", () => {
      mockUseCommunityPrograms.mockReturnValue({
        data: [{ programId: "program-1", metadata: { title: "Program One" } }],
        isLoading: false,
      } as any);

      render(<CommunityPageNavigator communityId={mockUseParams().communityId} />, { wrapper });

      expect(screen.getByText("Browse applications")).toBeInTheDocument();
      expect(screen.getByTestId("file-search-icon")).toBeInTheDocument();
    });

    it("should hide browse applications tab when programs count is 0", () => {
      mockUseCommunityPrograms.mockReturnValue({
        data: [],
        isLoading: false,
      } as any);

      render(<CommunityPageNavigator communityId={mockUseParams().communityId} />, { wrapper });

      expect(screen.queryByText("Browse applications")).not.toBeInTheDocument();
      expect(screen.queryByTestId("file-search-icon")).not.toBeInTheDocument();
    });

    it("should hide browse applications tab when programs are undefined (loading)", () => {
      mockUseCommunityPrograms.mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any);

      render(<CommunityPageNavigator communityId={mockUseParams().communityId} />, { wrapper });

      expect(screen.queryByText("Browse applications")).not.toBeInTheDocument();
    });

    it("should render browse applications link with correct href", () => {
      render(<CommunityPageNavigator communityId={mockUseParams().communityId} />, { wrapper });

      const link = screen.getByText("Browse applications").closest("a");
      expect(link).toHaveAttribute("href", "/community/test-community/browse-applications");
    });

    it("should apply active styles to browse applications link", () => {
      mockUsePathname.mockReturnValue("/community/test-community/browse-applications");

      render(<CommunityPageNavigator communityId={mockUseParams().communityId} />, { wrapper });

      const link = screen.getByText("Browse applications").closest("a");
      expect(link?.className).toContain("text-gray-900");
    });

    it("should not mark community projects as active on browse-applications page", () => {
      mockUsePathname.mockReturnValue("/community/test-community/browse-applications");

      render(<CommunityPageNavigator communityId={mockUseParams().communityId} />, { wrapper });

      const link = screen.getByText("View funded projects").closest("a");
      expect(link?.className).toContain("text-gray-500");
    });
  });

  describe("Active Tab Auto-Scroll", () => {
    it("should scroll active tab into view on mount", () => {
      mockUsePathname.mockReturnValue("/community/test-community/impact");

      render(<CommunityPageNavigator communityId={mockUseParams().communityId} />, { wrapper });

      expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    });
  });
});
