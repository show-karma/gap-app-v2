import { render, screen } from "@testing-library/react";
import { AdminSection } from "@/components/Pages/Dashboard/AdminSection/AdminSection";
import { useDashboardAdmin } from "@/hooks/useDashboardAdmin";

jest.mock("@/hooks/useDashboardAdmin", () => ({
  useDashboardAdmin: jest.fn(),
}));

const mockUseDashboardAdmin = useDashboardAdmin as unknown as jest.Mock;

describe("AdminSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders skeleton when loading", () => {
    mockUseDashboardAdmin.mockReturnValue({
      communities: [],
      isLoading: true,
      isError: false,
    });

    const { container } = render(<AdminSection />);

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders community cards with correct names and counts", () => {
    mockUseDashboardAdmin.mockReturnValue({
      communities: [
        {
          uid: "0xcommunity1",
          name: "Optimism",
          slug: "optimism",
          logoUrl: "logo.png",
          chainID: 10,
          activeProgramsCount: 2,
          pendingApplicationsCount: 5,
          manageUrl: "/community/optimism/manage",
        },
      ],
      isLoading: false,
      isError: false,
    });

    render(<AdminSection />);

    expect(screen.getByText("Optimism")).toBeInTheDocument();
    expect(screen.getByText("2 active programs")).toBeInTheDocument();
    expect(screen.getByText("5 pending applications")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Manage" })).toHaveAttribute(
      "href",
      "/community/optimism/manage"
    );
  });
});
