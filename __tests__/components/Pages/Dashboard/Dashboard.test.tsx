import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Dashboard } from "@/components/Pages/Dashboard/Dashboard";
import { setPostLoginRedirect, useAuth } from "@/hooks/useAuth";
import { useContributorProfile } from "@/hooks/useContributorProfile";
import { useDashboardAdmin } from "@/hooks/useDashboardAdmin";
import { useReviewerPrograms } from "@/hooks/usePermissions";
import { usePermissionContext } from "@/src/core/rbac/context/permission-context";
import { useStaff } from "@/src/core/rbac/hooks/use-staff-bridge";

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
  setPostLoginRedirect: vi.fn(),
}));

vi.mock("@/hooks/useContributorProfile", () => ({
  useContributorProfile: vi.fn(),
}));

vi.mock("@/hooks/useDashboardAdmin", () => ({
  useDashboardAdmin: vi.fn(),
}));

vi.mock("@/hooks/usePermissions", () => ({
  useReviewerPrograms: vi.fn(),
}));

vi.mock("@/src/core/rbac/context/permission-context", () => ({
  usePermissionContext: vi.fn(),
}));

vi.mock("@/src/core/rbac/hooks/use-staff-bridge", () => ({
  useStaff: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useParams: vi.fn(() => ({})),
  usePathname: vi.fn(() => "/"),
}));

vi.mock("@/components/EthereumAddressToENSAvatar", () => ({
  __esModule: true,
  default: () => <div data-testid="ens-avatar" />,
}));

vi.mock("@/components/EthereumAddressToProfileName", () => ({
  __esModule: true,
  default: ({ address }: { address: string }) => <span>{address}</span>,
}));

vi.mock("@/components/Dialogs/ProjectDialog/index", () => ({
  ProjectDialog: () => <button type="button">Create Project</button>,
}));

vi.mock("@/features/user-applications/hooks/use-user-applications", () => ({
  useUserApplications: vi.fn(() => ({
    applications: [],
    filters: { status: "all", programId: null, searchQuery: "" },
    sortBy: "createdAt",
    sortOrder: "desc",
    pagination: { page: 1, totalPages: 1, limit: 10 },
    isLoading: false,
    error: null,
    setFilters: vi.fn(),
    setSort: vi.fn(),
    setPage: vi.fn(),
    setPageSize: vi.fn(),
    refresh: vi.fn(),
  })),
}));

const mockUseQuery = useQuery as unknown as vi.Mock;
const mockUseRouter = useRouter as unknown as vi.Mock;
const mockUseAuth = useAuth as unknown as vi.Mock;
const mockSetPostLoginRedirect = setPostLoginRedirect as unknown as vi.Mock;
const mockUseContributorProfile = useContributorProfile as unknown as vi.Mock;
const mockUseDashboardAdmin = useDashboardAdmin as unknown as vi.Mock;
const mockUsePermissionContext = usePermissionContext as unknown as vi.Mock;
const mockUseStaff = useStaff as unknown as vi.Mock;
const mockUseReviewerPrograms = useReviewerPrograms as unknown as vi.Mock;

const setupAuth = ({
  authenticated,
  address,
  ready = true,
}: {
  authenticated: boolean;
  address?: string;
  ready?: boolean;
}) => {
  mockUseAuth.mockReturnValue({
    authenticated,
    address,
    ready,
  });
};

const setupPermissions = ({ isGuestDueToError = false }: { isGuestDueToError?: boolean } = {}) => {
  mockUsePermissionContext.mockReturnValue({
    isCommunityAdmin: false,
    isRegistryAdmin: false,
    isLoading: false,
    isGuestDueToError,
  });
  mockUseStaff.mockReturnValue({ isStaff: false, isLoading: false });
  mockUseReviewerPrograms.mockReturnValue({
    programs: [],
    isLoading: false,
    hasPrograms: false,
    error: null,
  });
};

// Fresh QueryClient per render — no afterEach cleanup required
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Drill-in writes the module key to location.hash; jsdom keeps the URL
    // across tests in this file, so reset it to avoid auto-opening a module.
    window.history.replaceState(null, "", window.location.pathname);
    mockUseRouter.mockReturnValue({ replace: vi.fn() });
    setupAuth({ authenticated: true, address: "0x123" });
    setupPermissions();
    mockUseDashboardAdmin.mockReturnValue({
      communities: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mockUseContributorProfile.mockReturnValue({ profile: { data: { name: "Alex" } } });
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isSuccess: true,
      isError: false,
      refetch: vi.fn(),
    });
  });

  it("redirects unauthenticated users away from dashboard", async () => {
    const replace = vi.fn();
    mockUseRouter.mockReturnValue({ replace });
    setupAuth({ authenticated: false, address: undefined, ready: true });

    const { container } = render(<Dashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockSetPostLoginRedirect).toHaveBeenCalledWith("/dashboard");
      expect(replace).toHaveBeenCalledWith("/");
    });

    // The v3 loading skeleton pulses via the `animate-dashv3-pulse` utility.
    expect(container.querySelectorAll(".animate-dashv3-pulse").length).toBeGreaterThan(0);
  });

  it("renders DashboardHeader when authenticated", () => {
    render(<Dashboard />, { wrapper: createWrapper() });

    expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
    // The soft shell shows the avatar in both the top nav and the header.
    expect(screen.getAllByTestId("ens-avatar").length).toBeGreaterThan(0);
  });

  it("renders an actionable projects tile when user has no projects and no roles", () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isSuccess: true,
      isError: false,
      refetch: vi.fn(),
    });

    render(<Dashboard />, { wrapper: createWrapper() });

    // The bento overview shows an actionable empty tile rather than the full
    // stacked section.
    expect(screen.getByText("My projects")).toBeInTheDocument();
    expect(screen.getByText(/Create a project to track grants/i)).toBeInTheDocument();
  });

  it("drills into the full projects section from the tile", () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isSuccess: true,
      isError: false,
      refetch: vi.fn(),
    });

    render(<Dashboard />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByText("My projects"));

    // Drill-in renders the full ProjectsSection (its heading + real empty state).
    expect(screen.getByText("My Projects")).toBeInTheDocument();
    expect(screen.getByText(/No projects yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to overview/i })).toBeInTheDocument();
  });

  it("does not render empty state when user has projects", () => {
    mockUseQuery.mockReturnValue({
      data: [{ uid: "project-1" }],
      isLoading: false,
      isSuccess: true,
      isError: false,
      refetch: vi.fn(),
    });

    render(<Dashboard />, { wrapper: createWrapper() });

    expect(screen.queryByText("Create your first project")).not.toBeInTheDocument();
  });

  it("does not render empty state when user is a reviewer", () => {
    mockUseReviewerPrograms.mockReturnValue({
      programs: [{ programId: "p1" }],
      isLoading: false,
      hasPrograms: true,
      error: null,
    });

    render(<Dashboard />, { wrapper: createWrapper() });

    expect(screen.queryByText("Create your first project")).not.toBeInTheDocument();
  });

  it("does not render empty state when user has reviewer programs", () => {
    mockUseReviewerPrograms.mockReturnValue({
      programs: [{ programId: "p1" }],
      isLoading: false,
      hasPrograms: true,
      error: null,
    });

    render(<Dashboard />, { wrapper: createWrapper() });

    expect(screen.queryByText("Create your first project")).not.toBeInTheDocument();
  });

  describe("Farcaster user with embedded wallet", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        authenticated: true,
        address: "0xEMBEDDED000000000000000000000000CAFE",
        ready: true,
        user: {
          id: "did:privy:fc-user",
          farcaster: {
            fid: 12345,
            username: "testfcuser",
            displayName: "Test FC User",
            pfp: "https://example.com/fc-avatar.png",
          },
        },
      });
      mockUseContributorProfile.mockReturnValue({ profile: null });
    });

    it("should show Farcaster display name instead of embedded wallet address", () => {
      render(<Dashboard />, { wrapper: createWrapper() });

      // The soft header greets by first name ("Welcome back, Test").
      expect(screen.getByText(/Welcome back, Test/)).toBeInTheDocument();
      expect(screen.queryByText(/0xEMBEDDED/i)).not.toBeInTheDocument();
    });

    it("should show Farcaster avatar instead of blockie", () => {
      const { container } = render(<Dashboard />, { wrapper: createWrapper() });

      const fcAvatar = container.querySelector('img[src="https://example.com/fc-avatar.png"]');
      expect(fcAvatar).toBeInTheDocument();
    });
  });

  describe("Farcaster user (no wallet address)", () => {
    beforeEach(() => {
      // Farcaster user: authenticated but no wallet address
      setupAuth({ authenticated: true, address: undefined, ready: true });
    });

    it("should render dashboard content instead of being stuck on loading", () => {
      render(<Dashboard />, { wrapper: createWrapper() });

      // Farcaster users have no wallet address but are authenticated.
      // The dashboard should NOT be permanently stuck on the loading skeleton.
      expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
    });

    it("should not show loading skeleton when authenticated without address", () => {
      const { container } = render(<Dashboard />, { wrapper: createWrapper() });

      // Should NOT show loading skeletons — the user is authenticated
      expect(container.querySelectorAll(".animate-pulse").length).toBe(0);
    });

    it("should enable the projects query for Farcaster users", () => {
      render(<Dashboard />, { wrapper: createWrapper() });

      // The projects useQuery call should have `enabled: true` even without an address.
      // The API uses JWT auth, not wallet address.
      const queryOptions = mockUseQuery.mock.calls[0][0];
      expect(queryOptions.enabled).toBe(true);
    });
  });

  describe("Email authenticated user", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        authenticated: true,
        address: "0xEMBEDDED000000000000000000000000CAFE",
        ready: true,
        user: {
          id: "did:privy:email-user",
          email: { address: "user@example.com" },
        },
      });
      mockUseContributorProfile.mockReturnValue({ profile: null });
    });

    it("should show email instead of wallet address in welcome message", () => {
      render(<Dashboard />, { wrapper: createWrapper() });

      expect(screen.getByText(/user@example.com/)).toBeInTheDocument();
      expect(screen.queryByText(/0xEMBEDDED/i)).not.toBeInTheDocument();
    });
  });

  describe("Google authenticated user", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        authenticated: true,
        address: "0xEMBEDDED000000000000000000000000CAFE",
        ready: true,
        user: {
          id: "did:privy:google-user",
          google: { email: "googleuser@gmail.com" },
        },
      });
      mockUseContributorProfile.mockReturnValue({ profile: null });
    });

    it("should show Google email instead of wallet address in welcome message", () => {
      render(<Dashboard />, { wrapper: createWrapper() });

      expect(screen.getByText(/googleuser@gmail.com/)).toBeInTheDocument();
      expect(screen.queryByText(/0xEMBEDDED/i)).not.toBeInTheDocument();
    });
  });

  it("shows permissions error warning when RBAC fails", () => {
    setupPermissions({ isGuestDueToError: true });

    render(<Dashboard />, { wrapper: createWrapper() });

    expect(screen.getByText(/couldn.t verify your permissions/i)).toBeInTheDocument();
  });

  it("surfaces a recoverable projects error via the tile and drill-in", () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isSuccess: false,
      isError: true,
      refetch: vi.fn(),
    });

    render(<Dashboard />, { wrapper: createWrapper() });

    // The tile shows a recover affordance; the full retry lives in the drill-in.
    const tile = screen.getByText("My projects");
    expect(tile).toBeInTheDocument();

    fireEvent.click(tile);

    expect(screen.getByText(/Unable to load your projects/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("does not show empty state when projects query fails", () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isSuccess: false,
      isError: true,
      refetch: vi.fn(),
    });

    render(<Dashboard />, { wrapper: createWrapper() });

    expect(screen.queryByText("Create your first project")).not.toBeInTheDocument();
  });

  describe("bento tiles", () => {
    const getTileOrder = (container: HTMLElement): string[] =>
      Array.from(container.querySelectorAll("[data-comment-anchor^='tile-']")).map((el) =>
        (el.getAttribute("data-comment-anchor") ?? "").replace("tile-", "")
      );

    it("hides the communities tile for users with no admin communities", () => {
      render(<Dashboard />, { wrapper: createWrapper() });

      expect(screen.queryByText("My communities")).not.toBeInTheDocument();
      expect(screen.queryByText(/No communities yet/i)).not.toBeInTheDocument();
    });

    it("shows the communities tile (loading skeleton) when the admin hook is loading", () => {
      mockUseDashboardAdmin.mockReturnValue({
        communities: [],
        isLoading: true,
        isError: false,
        refetch: vi.fn(),
      });

      const { container } = render(<Dashboard />, { wrapper: createWrapper() });

      // The loading tile shows a skeleton (no label) but keeps its anchor.
      expect(container.querySelector('[data-comment-anchor="tile-communities"]')).toBeInTheDocument();
    });

    it("surfaces an error affordance on the communities tile when the admin hook errors", () => {
      mockUseDashboardAdmin.mockReturnValue({
        communities: [],
        isLoading: false,
        isError: true,
        refetch: vi.fn(),
      });

      render(<Dashboard />, { wrapper: createWrapper() });

      expect(screen.getByText("My communities")).toBeInTheDocument();
      expect(screen.getByText(/Couldn't load this section/i)).toBeInTheDocument();
    });

    it("always orders the projects tile before the applications tile", () => {
      const { container } = render(<Dashboard />, { wrapper: createWrapper() });

      const order = getTileOrder(container);
      expect(order).toContain("projects");
      expect(order).toContain("applications");
      expect(order.indexOf("projects")).toBeLessThan(order.indexOf("applications"));
    });
  });
});
