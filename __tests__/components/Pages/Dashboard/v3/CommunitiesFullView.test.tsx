import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { CommunitiesFullView } from "@/components/Pages/Dashboard/v3/CommunitiesFullView";
import type { DashboardAdminCommunity } from "@/hooks/useDashboardAdmin";
import { useDashboardAdmin } from "@/hooks/useDashboardAdmin";

vi.mock("@/hooks/useDashboardAdmin", () => ({ useDashboardAdmin: vi.fn() }));

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
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// The create dialog is dynamically imported; stub it to a plain button.
vi.mock("@/components/Dialogs/CommunityDialog", () => ({
  CommunityDialog: ({ buttonElement }: { buttonElement: { text: string } }) => (
    <button type="button">{buttonElement.text}</button>
  ),
}));

const mockUseDashboardAdmin = useDashboardAdmin as unknown as Mock;

const community = (overrides: Partial<DashboardAdminCommunity> = {}): DashboardAdminCommunity => ({
  uid: "uid-1",
  name: "Filecoin",
  slug: "filecoin",
  logoUrl: undefined,
  chainID: 1,
  activeProgramsCount: 2,
  pendingApplicationsCount: 5,
  manageUrl: "/community/filecoin/admin",
  ...overrides,
});

describe("CommunitiesFullView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a card per community with pluralized counts and a Manage link", () => {
    mockUseDashboardAdmin.mockReturnValue({
      communities: [community()],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<CommunitiesFullView />);

    expect(screen.getByText("My communities")).toBeInTheDocument();
    expect(screen.getByText("Filecoin")).toBeInTheDocument();
    expect(screen.getByText("2 active programs")).toBeInTheDocument();
    expect(screen.getByText("5 pending applications")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Manage" })).toHaveAttribute(
      "href",
      "/community/filecoin/admin"
    );
  });

  it("singularizes counts of one", () => {
    mockUseDashboardAdmin.mockReturnValue({
      communities: [community({ activeProgramsCount: 1, pendingApplicationsCount: 1 })],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<CommunitiesFullView />);

    expect(screen.getByText("1 active program")).toBeInTheDocument();
    expect(screen.getByText("1 pending application")).toBeInTheDocument();
  });

  it("shows the New community action when populated", async () => {
    mockUseDashboardAdmin.mockReturnValue({
      communities: [community()],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<CommunitiesFullView />);

    expect(await screen.findByText("New community")).toBeInTheDocument();
  });

  it("renders skeleton cards while loading", () => {
    mockUseDashboardAdmin.mockReturnValue({
      communities: [],
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    });

    const { container } = render(<CommunitiesFullView />);

    expect(container.querySelectorAll(".animate-dashv3-pulse").length).toBeGreaterThan(0);
  });

  it("renders an empty state with a Create community action", async () => {
    mockUseDashboardAdmin.mockReturnValue({
      communities: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<CommunitiesFullView />);

    expect(screen.getByText("No communities yet")).toBeInTheDocument();
    expect(await screen.findByText("Create community")).toBeInTheDocument();
  });

  it("surfaces an error with a retry that refetches", () => {
    const refetch = vi.fn();
    mockUseDashboardAdmin.mockReturnValue({
      communities: [],
      isLoading: false,
      isError: true,
      refetch,
    });

    render(<CommunitiesFullView />);

    expect(screen.getByText("Unable to load your communities.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalled();
  });
});
