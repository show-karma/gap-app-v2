/**
 * Tests for ManageBreadcrumbs.
 *
 * Covers the breadcrumb dynamic-label resolution that fixes:
 *  - #1545: raw programId shown instead of the program name
 *  - #1423: raw portfolio-report slug + id shown instead of readable labels
 *  - #1269: missing labels for `portfolio-reports` / `config` segments
 *
 * Plus the agreed acceptance gates: positional `config` (no global collision),
 * graceful finite fallback for unresolved ids, loading skeleton (no raw-id
 * flash), whitelabel resolution, and per-page query gating (no cross-fetch).
 */

import { screen } from "@testing-library/react";
import { ManageBreadcrumbs } from "@/components/Manage/ManageBreadcrumbs";
import { formatRunDate } from "@/utilities/portfolio-reports/period";
import { renderWithProviders } from "../../utils/render";

const usePathnameMock = vi.fn();
const useParamsMock = vi.fn();
const useProgramMock = vi.fn();
const usePortfolioReportMock = vi.fn();
const useWhitelabelMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
  useParams: () => useParamsMock(),
}));

vi.mock("@/features/programs/hooks/use-program", () => ({
  useProgram: (programId: string) => useProgramMock(programId),
}));

vi.mock("@/hooks/portfolio-reports/usePortfolioReports", () => ({
  usePortfolioReport: (slug: string, reportId: string) => usePortfolioReportMock(slug, reportId),
}));

vi.mock("@/utilities/whitelabel-context", () => ({
  useWhitelabel: () => useWhitelabelMock(),
}));

vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const COMMUNITY = "test-community";
const MANAGE_ROOT = `/community/${COMMUNITY}/manage`;

function setProgram(value: { program: { name: string } | null; loading: boolean }) {
  useProgramMock.mockReturnValue({ ...value, error: null, refetch: vi.fn() });
}

function setReport(value: { data: { runDate: string } | undefined; isLoading: boolean }) {
  usePortfolioReportMock.mockReturnValue(value);
}

function render(pathname: string, params: Record<string, string> = {}) {
  usePathnameMock.mockReturnValue(pathname);
  useParamsMock.mockReturnValue({ communityId: COMMUNITY, ...params });
  return renderWithProviders(<ManageBreadcrumbs communitySlug={COMMUNITY} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  // Sensible defaults: nothing resolving, not whitelabel.
  setProgram({ program: null, loading: false });
  setReport({ data: undefined, isLoading: false });
  useWhitelabelMock.mockReturnValue({ isWhitelabel: false });
});

describe("ManageBreadcrumbs", () => {
  describe("structural rendering", () => {
    it("renders nothing on the manage root itself", () => {
      const { container } = render(MANAGE_ROOT);
      expect(container).toBeEmptyDOMElement();
    });

    it("renders nothing outside the manage area", () => {
      const { container } = render(`/community/${COMMUNITY}/projects`);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("static segment labels", () => {
    it("maps known static segments to human-readable labels", () => {
      render(`${MANAGE_ROOT}/milestones-report`);
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Milestones")).toBeInTheDocument();
    });

    it("labels the portfolio-reports segment (#1269)", () => {
      render(`${MANAGE_ROOT}/portfolio-reports`);
      expect(screen.getByText("Portfolio Reports")).toBeInTheDocument();
      expect(screen.queryByText("portfolio-reports")).not.toBeInTheDocument();
    });
  });

  describe("dynamic programId resolution (#1545)", () => {
    const PATH = `${MANAGE_ROOT}/funding-platform/101105/applications`;

    it("shows the program name instead of the raw id", () => {
      setProgram({ program: { name: "Filecoin Karma Batch!" }, loading: false });
      render(PATH, { programId: "101105" });
      expect(screen.getByText("Filecoin Karma Batch!")).toBeInTheDocument();
      expect(screen.queryByText("101105")).not.toBeInTheDocument();
    });

    it("shows a loading skeleton (never the raw id) while resolving", () => {
      setProgram({ program: null, loading: true });
      render(PATH, { programId: "101105" });
      expect(screen.getByLabelText("Loading")).toBeInTheDocument();
      expect(screen.queryByText("101105")).not.toBeInTheDocument();
    });

    it("falls back to a generic finite label when the id resolves to nothing", () => {
      setProgram({ program: null, loading: false });
      render(PATH, { programId: "101105" });
      expect(screen.getByText("Program")).toBeInTheDocument();
      expect(screen.queryByText("101105")).not.toBeInTheDocument();
    });
  });

  describe("dynamic reportId resolution (#1423)", () => {
    const PATH = `${MANAGE_ROOT}/portfolio-reports/rep-123`;

    it("shows the report's run-date label from the same formatter the page header uses", () => {
      setReport({ data: { runDate: "2026-04-30" }, isLoading: false });
      render(PATH, { reportId: "rep-123" });
      // Derived from the shared formatRunDate — proves crumb and header cannot drift.
      const expected = formatRunDate("2026-04-30").label;
      expect(expected).toBe("April 30, 2026");
      expect(screen.getByText(expected)).toBeInTheDocument();
      expect(screen.queryByText("rep-123")).not.toBeInTheDocument();
    });

    it("falls back to a generic label for a deleted / non-existent report id", () => {
      setReport({ data: undefined, isLoading: false });
      render(`${MANAGE_ROOT}/portfolio-reports/fake-report-id`, { reportId: "fake-report-id" });
      expect(screen.getByText("Report")).toBeInTheDocument();
      expect(screen.queryByText("fake-report-id")).not.toBeInTheDocument();
    });
  });

  describe("positional `config` label (#1269)", () => {
    it("labels config as Configuration under portfolio-reports", () => {
      render(`${MANAGE_ROOT}/portfolio-reports/config`);
      expect(screen.getByText("Portfolio Reports")).toBeInTheDocument();
      expect(screen.getByText("Configuration")).toBeInTheDocument();
    });

    it("does NOT relabel config when it appears under a different parent", () => {
      render(`${MANAGE_ROOT}/setup/config`);
      expect(screen.queryByText("Configuration")).not.toBeInTheDocument();
      // Unrecognised-here segment is titleized, not turned into the special label.
      expect(screen.getByText("Config")).toBeInTheDocument();
    });
  });

  describe("query gating (no cross-fetch between pages)", () => {
    it("disables the report query on a funding page", () => {
      render(`${MANAGE_ROOT}/funding-platform/101105/applications`, { programId: "101105" });
      // Empty reportId → usePortfolioReport's internal `enabled` is false.
      expect(usePortfolioReportMock).toHaveBeenCalledWith(COMMUNITY, "");
    });

    it("disables the program query on a report page", () => {
      render(`${MANAGE_ROOT}/portfolio-reports/rep-123`, { reportId: "rep-123" });
      // Empty programId → useProgram's internal `enabled` is false.
      expect(useProgramMock).toHaveBeenCalledWith("");
    });
  });

  describe("whitelabel mode", () => {
    it("resolves dynamic names on the shortened whitelabel path", () => {
      useWhitelabelMock.mockReturnValue({ isWhitelabel: true });
      setProgram({ program: { name: "Filecoin Karma Batch!" }, loading: false });
      // Whitelabel pathname omits the /community/<slug> prefix.
      render("/manage/funding-platform/101105/applications", { programId: "101105" });
      expect(screen.getByText("Filecoin Karma Batch!")).toBeInTheDocument();
      expect(screen.queryByText("101105")).not.toBeInTheDocument();
    });
  });

  describe("render stability", () => {
    it("produces stable output across re-renders with the same props (no #185 loop)", () => {
      setProgram({ program: { name: "Filecoin Karma Batch!" }, loading: false });
      const { rerender } = render(`${MANAGE_ROOT}/funding-platform/101105/applications`, {
        programId: "101105",
      });
      expect(screen.getByText("Filecoin Karma Batch!")).toBeInTheDocument();
      rerender(<ManageBreadcrumbs communitySlug={COMMUNITY} />);
      expect(screen.getByText("Filecoin Karma Batch!")).toBeInTheDocument();
    });
  });
});
