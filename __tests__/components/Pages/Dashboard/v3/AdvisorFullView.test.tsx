import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdvisorFullView } from "@/components/Pages/Dashboard/v3/AdvisorModule";
import type { ResearchReportListItem } from "@/types/donor-research";

// Rail's "Saved nonprofits" tab is backed by the research tray.
const savedMock = vi.fn();
vi.mock("@/src/features/non-profits/hooks/use-research-tray", () => ({
  useResearchTray: () => savedMock(),
}));

vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a className={className} href={href}>
      {children}
    </a>
  ),
}));

const advisorMock = vi.fn();
vi.mock("@/hooks/useDonorAdvisor", () => ({ useDonorAdvisor: () => advisorMock() }));

const handlesMock = vi.fn();
vi.mock("@/hooks/useDonorHandles", () => ({ useDonorHandles: () => handlesMock() }));

const listReportsMock = vi.fn();
vi.mock("@/services/donor-research.service", () => ({
  listResearchReports: () => listReportsMock(),
}));

const report = (overrides: Partial<ResearchReportListItem> = {}): ResearchReportListItem =>
  ({
    id: "r1",
    donorHandleId: "h1",
    donorHandleLabel: "Acme Foundation",
    criteriaId: "c1",
    criteriaSummary: "Climate resilience funders",
    mode: "deep",
    status: "complete",
    hasShareToken: false,
    shareTokenExpiresAt: null,
    createdAt: "2026-01-10T00:00:00.000Z",
    fastCompletedAt: null,
    completedAt: "2026-01-11T00:00:00.000Z",
    errorMessage: null,
    ...overrides,
  }) as ResearchReportListItem;

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AdvisorFullView authenticated={true} />
    </QueryClientProvider>
  );
}

describe("AdvisorFullView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    advisorMock.mockReturnValue({ data: { id: "adv" }, isLoading: false });
    handlesMock.mockReturnValue({
      data: { items: [] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    savedMock.mockReturnValue({ data: [], isLoading: false, isError: false, refetch: vi.fn() });
    listReportsMock.mockResolvedValue({ items: [report()], limit: 6, offset: 0 });
  });

  it("shows Research reports by default, with the rail and a redirecting New report link", async () => {
    listReportsMock.mockResolvedValue({
      items: [report({ donorHandleLabel: "Acme Foundation" })],
      limit: 6,
      offset: 0,
    });
    renderView();

    // "Your work" rail — order: Research reports, Donor handles, Saved nonprofits.
    expect(screen.getByText("Your work")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /research reports/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /donor handles/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /saved nonprofits/i })).toBeInTheDocument();

    // The reports section is the default view; New report is a redirect link.
    expect(screen.getByText("Every report you've generated")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /new report/i })).toHaveAttribute(
      "href",
      expect.stringContaining("nonprofit-research")
    );
    expect(await screen.findByText("Acme Foundation")).toBeInTheDocument();
  });

  it("empties to a redirect CTA when there are no reports", async () => {
    listReportsMock.mockResolvedValue({ items: [], limit: 6, offset: 0 });
    renderView();

    expect(await screen.findByText("No research reports yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /new research report/i })).toHaveAttribute(
      "href",
      expect.stringContaining("nonprofit-research")
    );
  });

  it("surfaces a reports error with retry", async () => {
    listReportsMock.mockRejectedValue(new Error("boom"));
    renderView();

    expect(await screen.findByText("Unable to load your research reports.")).toBeInTheDocument();
  });

  it("switches to the Saved nonprofits tab, with a Find funders header link", async () => {
    savedMock.mockReturnValue({
      data: [
        {
          id: "b1",
          userId: "u1",
          entityType: "nonprofit",
          entityId: "e1",
          name: "Ocean Trust",
          metadata: null,
          createdAt: "2026-01-08T00:00:00.000Z",
        },
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    renderView();

    fireEvent.click(screen.getByRole("button", { name: /saved nonprofits/i }));
    expect(await screen.findByText("Ocean Trust")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /find funders/i })).toHaveAttribute(
      "href",
      expect.stringContaining("find-funders")
    );
  });

  it("switches the Donor handles tab and cross-links to the Personas section", async () => {
    handlesMock.mockReturnValue({
      data: {
        items: [
          {
            id: "h1",
            advisorId: "adv",
            opaqueLabel: "Coastal Trust",
            notes: null,
            createdAt: "2026-01-05T00:00:00.000Z",
            updatedAt: "2026-01-05T00:00:00.000Z",
          },
        ],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    renderView();

    fireEvent.click(screen.getByRole("button", { name: /donor handles/i }));
    const row = await screen.findByRole("link", { name: /Coastal Trust/ });

    // Header "New handle" links out to the full Personas page (redesign P5) —
    // creation no longer happens inline in the dashboard.
    expect(screen.getByRole("link", { name: "New handle" })).toHaveAttribute(
      "href",
      expect.stringContaining("nonprofit-research/personas")
    );

    // Clicking an existing handle opens its persona detail page (profile
    // editing lives there now, not in a dashboard modal).
    expect(row).toHaveAttribute("href", expect.stringContaining("nonprofit-research/personas/h1"));
  });
});
