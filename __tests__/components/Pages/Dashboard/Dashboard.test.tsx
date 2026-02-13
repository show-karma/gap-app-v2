import { useQuery } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { Dashboard } from "@/components/Pages/Dashboard/Dashboard";
import { setPostLoginRedirect, useAuth } from "@/hooks/useAuth";
import { useContributorProfile } from "@/hooks/useContributorProfile";
import { useDashboardAdmin } from "@/hooks/useDashboardAdmin";
import { useReviewerPrograms } from "@/hooks/usePermissions";
import { usePermissionContext } from "@/src/core/rbac/context/permission-context";
import { useStaff } from "@/src/core/rbac/hooks/use-staff-bridge";

jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");
  return {
    ...actual,
    useQuery: jest.fn(),
  };
});

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
  setPostLoginRedirect: jest.fn(),
}));

jest.mock("@/hooks/useContributorProfile", () => ({
  useContributorProfile: jest.fn(),
}));

jest.mock("@/hooks/useDashboardAdmin", () => ({
  useDashboardAdmin: jest.fn(),
}));

jest.mock("@/hooks/usePermissions", () => ({
  useReviewerPrograms: jest.fn(),
}));

jest.mock("@/src/core/rbac/context/permission-context", () => ({
  usePermissionContext: jest.fn(),
}));

jest.mock("@/src/core/rbac/hooks/use-staff-bridge", () => ({
  useStaff: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/components/EthereumAddressToENSAvatar", () => ({
  __esModule: true,
  default: () => <div data-testid="ens-avatar" />,
}));

jest.mock("@/components/EthereumAddressToENSName", () => ({
  __esModule: true,
  default: ({ address }: { address: string }) => <span>{address}</span>,
}));

jest.mock("@/components/Dialogs/ProjectDialog/index", () => ({
  ProjectDialog: () => <button type="button">Create Project</button>,
}));

const mockUseQuery = useQuery as unknown as jest.Mock;
const mockUseRouter = useRouter as unknown as jest.Mock;
const mockUseAuth = useAuth as unknown as jest.Mock;
const mockSetPostLoginRedirect = setPostLoginRedirect as unknown as jest.Mock;
const mockUseContributorProfile = useContributorProfile as unknown as jest.Mock;
const mockUseDashboardAdmin = useDashboardAdmin as unknown as jest.Mock;
const mockUsePermissionContext = usePermissionContext as unknown as jest.Mock;
const mockUseStaff = useStaff as unknown as jest.Mock;
const mockUseReviewerPrograms = useReviewerPrograms as unknown as jest.Mock;

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

const setupPermissions = ({
  isReviewer = false,
  isGuestDueToError = false,
}: {
  isReviewer?: boolean;
  isGuestDueToError?: boolean;
} = {}) => {
  mockUsePermissionContext.mockReturnValue({
    isReviewer,
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

describe("Dashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ replace: jest.fn() });
    setupAuth({ authenticated: true, address: "0x123" });
    setupPermissions();
    mockUseDashboardAdmin.mockReturnValue({
      communities: [],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    mockUseContributorProfile.mockReturnValue({ profile: { data: { name: "Alex" } } });
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isSuccess: true,
      isError: false,
    });
  });

  it("redirects unauthenticated users away from dashboard", async () => {
    const replace = jest.fn();
    mockUseRouter.mockReturnValue({ replace });
    setupAuth({ authenticated: false, address: undefined, ready: true });

    const { container } = render(<Dashboard />);

    await waitFor(() => {
      expect(mockSetPostLoginRedirect).toHaveBeenCalledWith("/dashboard");
      expect(replace).toHaveBeenCalledWith("/");
    });

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders DashboardHeader when authenticated", () => {
    render(<Dashboard />);

    expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
    expect(screen.getByTestId("ens-avatar")).toBeInTheDocument();
  });

  it("renders DashboardEmptyState when user has no projects and no roles", () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isSuccess: true,
      isError: false,
    });

    render(<Dashboard />);

    expect(screen.getByText("Create your first project")).toBeInTheDocument();
  });

  it("shows the projects section empty state when no projects are found", () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isSuccess: true,
      isError: false,
    });

    render(<Dashboard />);

    expect(screen.getByText("My Projects")).toBeInTheDocument();
    expect(screen.getByText(/No projects yet/i)).toBeInTheDocument();
  });

  it("does not render empty state when user has projects", () => {
    mockUseQuery.mockReturnValue({
      data: [{ uid: "project-1" }],
      isLoading: false,
      isSuccess: true,
      isError: false,
    });

    render(<Dashboard />);

    expect(screen.queryByText("Create your first project")).not.toBeInTheDocument();
  });

  it("does not render empty state when user is a reviewer", () => {
    setupPermissions({ isReviewer: true });

    render(<Dashboard />);

    expect(screen.queryByText("Create your first project")).not.toBeInTheDocument();
  });

  it("does not render empty state when user has reviewer programs", () => {
    mockUseReviewerPrograms.mockReturnValue({
      programs: [{ programId: "p1" }],
      isLoading: false,
      hasPrograms: true,
      error: null,
    });

    render(<Dashboard />);

    expect(screen.queryByText("Create your first project")).not.toBeInTheDocument();
  });

  it("shows permissions error warning when RBAC fails", () => {
    setupPermissions({ isGuestDueToError: true });

    render(<Dashboard />);

    expect(screen.getByText(/couldn.t verify your permissions/i)).toBeInTheDocument();
  });
});
