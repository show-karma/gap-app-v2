import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { CommunityPageNavigator } from "@/components/Pages/Communities/CommunityPageNavigator";
import { useCommunityDetails } from "@/hooks/communities/useCommunityDetails";
import { usePublishedReports } from "@/hooks/portfolio-reports/usePortfolioReports";
import { useCommunityPrograms } from "@/hooks/usePrograms";
import { useWhitelabel } from "@/utilities/whitelabel-context";

vi.mock("@/hooks/communities/useCommunityDetails");
vi.mock("@/hooks/portfolio-reports/usePortfolioReports");
vi.mock("@/hooks/usePrograms");
vi.mock("@/utilities/whitelabel-context");

const mockUseParams = vi.fn();
const mockUsePathname = vi.fn();
const mockUseSearchParams = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => mockUseParams(),
  usePathname: () => mockUsePathname(),
  useSearchParams: () => mockUseSearchParams(),
}));

vi.mock("@/utilities/pages", () => ({
  PAGES: {
    COMMUNITY: {
      FUNDING_OPPORTUNITIES: (id: string) => `/community/${id}/funding-opportunities`,
      PROJECTS: (id: string) => `/community/${id}/projects`,
      UPDATES: (id: string) => `/community/${id}/updates`,
      IMPACT: (id: string) => `/community/${id}/impact`,
      REPORTS: (id: string) => `/community/${id}/reports`,
      FINANCIALS: (id: string) => `/community/${id}/financials`,
      BROWSE_APPLICATIONS: (id: string) => `/community/${id}/browse-applications`,
    },
  },
}));

vi.mock("@/utilities/community-flags", () => ({
  FINANCIALS_ENABLED_COMMUNITIES: ["filecoin"],
  FUNDING_PROGRAMS_OVERVIEW_URLS: { filecoin: "https://filpgf.io/funding-programs/" },
}));

vi.mock("lucide-react", () => ({
  ChartLine: (props: any) => <svg data-testid="chart-line-icon" {...props} />,
  DollarSign: (props: any) => <svg data-testid="dollar-sign-icon" {...props} />,
  FileSearch: (props: any) => <svg data-testid="file-search-icon" {...props} />,
  FileText: (props: any) => <svg data-testid="file-text-icon" {...props} />,
  LandPlot: (props: any) => <svg data-testid="land-plot-icon" {...props} />,
  Layers: (props: any) => <svg data-testid="layers-icon" {...props} />,
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

const setCommunitySlug = (slug: string) => {
  mockUseCommunityDetails.mockReturnValue({
    data: {
      uid: "0x1234567890123456789012345678901234567890",
      details: { name: "Community", slug },
    },
    isLoading: false,
  } as any);
};

describe("CommunityPageNavigator — Funding Programs tab", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();

    mockUseWhitelabel.mockReturnValue({
      isWhitelabel: false,
      communitySlug: null,
      config: null,
    } as any);
    mockUseParams.mockReturnValue({ communityId: "filecoin" });
    mockUsePathname.mockReturnValue("/community/filecoin");
    mockUseSearchParams.mockReturnValue({ get: vi.fn(() => null) });
    setCommunitySlug("filecoin");
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

  it("shows an external Funding Programs tab in whitelabel mode for a community with an overview URL", () => {
    mockUseWhitelabel.mockReturnValue({
      isWhitelabel: true,
      communitySlug: "filecoin",
      config: null,
    } as any);

    render(<CommunityPageNavigator />, { wrapper });

    const link = screen.getByText("Funding Programs").closest("a");
    expect(link).toHaveAttribute("href", "https://filpgf.io/funding-programs/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByTestId("layers-icon")).toBeInTheDocument();
  });

  it("hides the Funding Programs tab outside whitelabel mode even for a mapped community", () => {
    mockUseWhitelabel.mockReturnValue({
      isWhitelabel: false,
      communitySlug: "filecoin",
      config: null,
    } as any);

    render(<CommunityPageNavigator />, { wrapper });

    expect(screen.queryByText("Funding Programs")).not.toBeInTheDocument();
    expect(screen.queryByTestId("layers-icon")).not.toBeInTheDocument();
  });

  it("hides the Funding Programs tab in whitelabel mode for a community without an overview URL", () => {
    setCommunitySlug("some-other-community");
    mockUseWhitelabel.mockReturnValue({
      isWhitelabel: true,
      communitySlug: "some-other-community",
      config: null,
    } as any);

    render(<CommunityPageNavigator />, { wrapper });

    expect(screen.queryByText("Funding Programs")).not.toBeInTheDocument();
  });
});
