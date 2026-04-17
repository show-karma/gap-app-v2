import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Dashboard } from "@/components/Pages/Dashboard/Dashboard";
import { setPostLoginRedirect, useAuth } from "@/hooks/useAuth";
import { useContributorProfile } from "@/hooks/useContributorProfile";
import { useDashboardAdmin } from "@/hooks/useDashboardAdmin";
import { useReviewerPrograms } from "@/hooks/usePermissions";
import { usePermissionContext } from "@/src/core/rbac/context/permission-context";
import { useStaff } from "@/src/core/rbac/hooks/use-staff-bridge";

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
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
}));

vi.mock("@/components/EthereumAddressToENSAvatar", () => ({
  __esModule: true,
  default: () => <div data-testid="ens-avatar" />,
}));

vi.mock("@/components/EthereumAddressToENSName", () => ({
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

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders DashboardHeader when authenticated", () => {
    render(<Dashboard />, { wrapper: createWrapper() });

    expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
    expect(screen.getByTestId("ens-avatar")).toBeInTheDocument();
  });

  it("renders section empty states when user has no projects and no roles", () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isSuccess: true,
      isError: false,
      refetch: vi.fn(),
    });

    render(<Dashboard />, { wrapper: createWrapper() });

    expect(screen.getByText(/No projects yet/i)).toBeInTheDocument();
  });

  it("shows the projects section empty state when no projects are found", () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isSuccess: true,
      isError: false,
      refetch: vi.fn(),
    });

    render(<Dashboard />, { wrapper: createWrapper() });

    expect(screen.getByText("My Projects")).toBeInTheDocument();
    expect(screen.getByText(/No projects yet/i)).toBeInTheDocument();
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

      expect(screen.getByText(/Test FC User/)).toBeInTheDocument();
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

  it("shows projects error banner with retry when projects query fails", () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isSuccess: false,
      isError: true,
      refetch: vi.fn(),
    });

    render(<Dashboard />, { wrapper: createWrapper() });

    expect(screen.getByText("My Projects")).toBeInTheDocument();
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
});
