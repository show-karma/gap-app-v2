import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Dashboard } from "@/components/Pages/Dashboard/Dashboard";
import { useUserApplications } from "@/features/user-applications/hooks/use-user-applications";
import { setPostLoginRedirect, useAuth } from "@/hooks/useAuth";
import { useContributorProfile } from "@/hooks/useContributorProfile";
import { useDashboardAdmin } from "@/hooks/useDashboardAdmin";
import { useDonorAdvisor } from "@/hooks/useDonorAdvisor";
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

// The global useQuery mock above would make useDonorAdvisor resolve `[]`
// (non-null → advisor); the "not an advisor" default is set in beforeEach
// since clearAllMocks doesn't undo a per-test mockReturnValue override.
vi.mock("@/hooks/useDonorAdvisor", () => ({
  useDonorAdvisor: vi.fn(),
}));

vi.mock("@/hooks/usePermissions", () => ({
  useReviewerPrograms: vi.fn(),
}));

// The data queries are gated on a resolved auth token; treat it as ready so the
// dashboard renders past the loading skeleton in tests.
vi.mock("@/hooks/useTokenReady", () => ({
  useTokenReady: () => true,
}));

// The reviews tile fetches per-community inbox stats; stub the summary hook so
// these tests don't need the inbox endpoint (its own test covers the logic).
vi.mock("@/components/Pages/Dashboard/v3/useReviewsSummary", () => ({
  useReviewsSummary: () => ({ status: "ready", summary: { big: 0, rows: [] } }),
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

// Render motion elements/AnimatePresence synchronously (jsdom has no layout
// engine). Scoped here rather than globally so it can't mask motion behavior
// in other suites.
vi.mock("motion/react", () => import("@/__tests__/helpers/motion-mock"));

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
const mockUseUserApplications = useUserApplications as unknown as vi.Mock;
const mockUseDonorAdvisor = useDonorAdvisor as unknown as vi.Mock;

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
    // Reset per-test since `vi.clearAllMocks()` doesn't clear a prior
    // `mockReturnValue` override — without this, a later test could
    // inherit another test's applications data.
    mockUseUserApplications.mockReturnValue({
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
    });
    mockUseDonorAdvisor.mockReturnValue({ data: null, isLoading: false });
  });

  it("redirects unauthenticated users away, preserving the target path", async () => {
    // The post-login redirect preserves the exact path (incl. a drill-in like
    // /dashboard/reviews), not a hardcoded /dashboard.
    window.history.replaceState(null, "", "/dashboard/reviews");
    const replace = vi.fn();
    mockUseRouter.mockReturnValue({ replace });
    setupAuth({ authenticated: false, address: undefined, ready: true });

    const { container } = render(<Dashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockSetPostLoginRedirect).toHaveBeenCalledWith("/dashboard/reviews");
      expect(replace).toHaveBeenCalledWith("/");
    });

    // The v3 loading skeleton pulses via the `animate-dashv3-pulse` utility.
    expect(container.querySelectorAll(".animate-dashv3-pulse").length).toBeGreaterThan(0);
  });

  it("renders dashboard content when authenticated", () => {
    render(<Dashboard />, { wrapper: createWrapper() });

    // With no role modules the authenticated shell renders the getting-started
    // cards rather than a loading skeleton.
    expect(screen.getByText("Get started with Karma")).toBeInTheDocument();
  });

  it("hides the projects tile when the user has no projects and no roles", () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isSuccess: true,
      isError: false,
      refetch: vi.fn(),
    });

    render(<Dashboard />, { wrapper: createWrapper() });

    // My projects should show only if the user has projects.
    expect(screen.queryByText("My projects")).not.toBeInTheDocument();
  });

  it("drills into the full projects section from the tile", async () => {
    mockUseQuery.mockReturnValue({
      data: [{ uid: "project-1", details: { title: "Project One" } }],
      isLoading: false,
      isSuccess: true,
      isError: false,
      refetch: vi.fn(),
    });

    render(<Dashboard />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole("button", { name: /open my projects/i }));

    // The overview <-> drill-in switch animates (AnimatePresence mode="wait"),
    // so the new content mounts once the outgoing view's exit finishes.
    expect(await screen.findByText("Project One")).toBeInTheDocument();
    expect(screen.getByText("My projects")).toBeInTheDocument();
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

  describe("Farcaster user (no wallet address)", () => {
    beforeEach(() => {
      // Farcaster user: authenticated but no wallet address
      setupAuth({ authenticated: true, address: undefined, ready: true });
    });

    it("should render dashboard content instead of being stuck on loading", () => {
      render(<Dashboard />, { wrapper: createWrapper() });

      // Farcaster users have no wallet address but are authenticated.
      // The dashboard should NOT be permanently stuck on the loading skeleton.
      expect(screen.getByText("Get started with Karma")).toBeInTheDocument();
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

  it("shows permissions error warning when RBAC fails", () => {
    setupPermissions({ isGuestDueToError: true });

    render(<Dashboard />, { wrapper: createWrapper() });

    expect(screen.getByText(/couldn.t verify your permissions/i)).toBeInTheDocument();
  });

  it("hides the admin panel banner while drilled into a module, and restores it on back", async () => {
    // Admin panel should show only for a super-admin (staff), not for a
    // registry admin (Allo registry curator — a distinct, lesser role).
    mockUseStaff.mockReturnValue({ isStaff: true, isLoading: false });
    mockUseQuery.mockReturnValue({
      data: [{ uid: "project-1", details: { title: "Project One" } }],
      isLoading: false,
      isSuccess: true,
      isError: false,
      refetch: vi.fn(),
    });

    render(<Dashboard />, { wrapper: createWrapper() });

    // Overview: the admin banner sits below the bento grid.
    expect(screen.getByText("Admin panel")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /open my projects/i }));

    // Drilled in: the banner is a bento-overview affordance, so it hides. This
    // is driven by Dashboard's own isDrilledIn state (not the BentoOverview
    // transition), so it updates immediately — no need to await it.
    expect(screen.queryByText("Admin panel")).not.toBeInTheDocument();

    // The overview <-> drill-in switch animates (AnimatePresence mode="wait"),
    // so the back button mounts once the drill-in's enter transition settles.
    fireEvent.click(await screen.findByRole("button", { name: /back to overview/i }));

    // Back on the overview: the banner returns.
    expect(await screen.findByText("Admin panel")).toBeInTheDocument();
  });

  it("surfaces a recoverable projects error via the tile and drill-in", async () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isSuccess: false,
      isError: true,
      refetch: vi.fn(),
    });

    render(<Dashboard />, { wrapper: createWrapper() });

    // The tile shows a recover affordance; the full retry lives in the drill-in.
    expect(screen.getByText("My projects")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /open my projects/i }));

    expect(await screen.findByText(/Unable to load your projects/i)).toBeInTheDocument();
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
      expect(
        container.querySelector('[data-comment-anchor="tile-communities"]')
      ).toBeInTheDocument();
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

    it("keeps the applications tile mounted when a filter matches zero applications", () => {
      // Search/status filters are applied server-side, so a zero-match search
      // returns empty applications AND zero status counts. That must NOT be
      // treated as a true-empty module (which would unmount the whole tile and
      // strand the user with no way to clear the filter) — the tile stays so the
      // drill-in can show "no matches" and offer to clear.
      mockUseUserApplications.mockReturnValue({
        applications: [],
        filters: { status: "all", programId: null, searchQuery: "no-such-app" },
        sortBy: "createdAt",
        sortOrder: "desc",
        pagination: { page: 1, totalPages: 1, limit: 10 },
        statusCounts: {},
        isLoading: false,
        error: null,
        setFilters: vi.fn(),
        setSort: vi.fn(),
        setPage: vi.fn(),
        setPageSize: vi.fn(),
        refresh: vi.fn(),
      });

      const { container } = render(<Dashboard />, { wrapper: createWrapper() });

      expect(
        container.querySelector('[data-comment-anchor="tile-applications"]')
      ).toBeInTheDocument();
    });

    it("hides the applications tile when there are no applications and no active filter", () => {
      // Default mock: empty applications, no status counts, no filters → the
      // genuine "get started" empty state, so the tile is hidden entirely.
      render(<Dashboard />, { wrapper: createWrapper() });

      expect(screen.queryByText("My applications")).not.toBeInTheDocument();
    });

    it("always orders the projects tile before the applications tile", () => {
      mockUseQuery.mockReturnValue({
        data: [{ uid: "project-1", details: { title: "Project One" } }],
        isLoading: false,
        isSuccess: true,
        isError: false,
        refetch: vi.fn(),
      });
      mockUseUserApplications.mockReturnValue({
        applications: [{ id: "app-1", programTitle: "Program One", status: "pending" }],
        filters: { status: "all", programId: null, searchQuery: "" },
        sortBy: "createdAt",
        sortOrder: "desc",
        pagination: { page: 1, totalPages: 1, limit: 10 },
        statusCounts: { pending: 1 },
        isLoading: false,
        error: null,
        setFilters: vi.fn(),
        setSort: vi.fn(),
        setPage: vi.fn(),
        setPageSize: vi.fn(),
        refresh: vi.fn(),
      });

      const { container } = render(<Dashboard />, { wrapper: createWrapper() });

      const order = getTileOrder(container);
      expect(order).toContain("projects");
      expect(order).toContain("applications");
      expect(order.indexOf("projects")).toBeLessThan(order.indexOf("applications"));
    });
  });

  describe("role-aware section visibility", () => {
    it("hides the admin panel for a registry admin who is not a super-admin", () => {
      mockUsePermissionContext.mockReturnValue({
        isCommunityAdmin: false,
        isRegistryAdmin: true,
        isLoading: false,
        isGuestDueToError: false,
      });
      mockUseStaff.mockReturnValue({ isStaff: false, isLoading: false });

      render(<Dashboard />, { wrapper: createWrapper() });

      expect(screen.queryByText("Admin panel")).not.toBeInTheDocument();
    });

    it("shows the admin panel for a super-admin", () => {
      mockUseStaff.mockReturnValue({ isStaff: true, isLoading: false });

      render(<Dashboard />, { wrapper: createWrapper() });

      expect(screen.getByText("Admin panel")).toBeInTheDocument();
    });

    it("hides My reviews for a user with no reviewer role and no admin pending applications", () => {
      render(<Dashboard />, { wrapper: createWrapper() });

      expect(screen.queryByText("My reviews")).not.toBeInTheDocument();
    });

    it("shows getting-started cards when the user matches no role module", () => {
      render(<Dashboard />, { wrapper: createWrapper() });

      expect(screen.getByText("Get started with Karma")).toBeInTheDocument();
      expect(screen.getByText("Create a project")).toBeInTheDocument();
      expect(screen.getByText("Apply for funding")).toBeInTheDocument();
      expect(screen.getByText("Explore communities")).toBeInTheDocument();
      expect(screen.getByText("Find funders")).toBeInTheDocument();
    });

    it("holds a skeleton instead of getting-started cards while the advisor check is undecided", () => {
      mockUseDonorAdvisor.mockReturnValue({ data: undefined, isLoading: true });

      const { container } = render(<Dashboard />, { wrapper: createWrapper() });

      expect(screen.queryByText("Get started with Karma")).not.toBeInTheDocument();
      expect(container.querySelectorAll(".animate-dashv3-pulse").length).toBeGreaterThan(0);
    });

    it("shows a secondary getting-started row beside a role module, minus the module's own card", () => {
      mockUseQuery.mockReturnValue({
        data: [{ uid: "project-1", details: { title: "Project One" } }],
        isLoading: false,
        isSuccess: true,
        isError: false,
        refetch: vi.fn(),
      });

      render(<Dashboard />, { wrapper: createWrapper() });

      expect(screen.getByText("My projects")).toBeInTheDocument();
      // Secondary variant heading, not the first-run one.
      expect(screen.queryByText("Get started with Karma")).not.toBeInTheDocument();
      expect(screen.getByText("Explore more on Karma")).toBeInTheDocument();
      // The user already has projects, so that card is filtered out; the rest remain.
      expect(screen.queryByText("Create a project")).not.toBeInTheDocument();
      expect(screen.getByText("Apply for funding")).toBeInTheDocument();
      expect(screen.getByText("Explore communities")).toBeInTheDocument();
      expect(screen.getByText("Find funders")).toBeInTheDocument();
    });

    it("shows My reviews for a community admin/owner with pending applications, even without an explicit reviewer role", () => {
      mockUseDashboardAdmin.mockReturnValue({
        communities: [
          {
            uid: "community-1",
            name: "Optimism",
            slug: "optimism",
            chainID: 10,
            activeProgramsCount: 1,
            pendingApplicationsCount: 3,
            manageUrl: "/admin/optimism",
          },
        ],
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      });

      render(<Dashboard />, { wrapper: createWrapper() });

      expect(screen.getByText("My reviews")).toBeInTheDocument();
    });
  });
});
