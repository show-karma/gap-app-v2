import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ReviewerManagementTab } from "@/components/FundingPlatform/QuestionBuilder/ReviewerManagementTab";
import { Permission } from "@/src/core/rbac/types/permission";

const mockCan = jest.fn();
const mockUsePermissionContext = jest.fn();
const mockRoleManagementTab = jest.fn();
const mockUseProgramReviewers = jest.fn();
const mockUseMilestoneReviewers = jest.fn();

jest.mock("@/src/core/rbac/context/permission-context", () => ({
  usePermissionContext: () => mockUsePermissionContext(),
}));

jest.mock("@/hooks/useProgramReviewers", () => ({
  useProgramReviewers: (...args: unknown[]) => mockUseProgramReviewers(...args),
}));

jest.mock("@/hooks/useMilestoneReviewers", () => ({
  useMilestoneReviewers: (...args: unknown[]) => mockUseMilestoneReviewers(...args),
}));

jest.mock("@/components/Utilities/Spinner", () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

jest.mock("@/components/FundingPlatform/PageHeader", () => ({
  PAGE_HEADER_CONTENT: {
    reviewers: {
      title: "Reviewers",
      description: "Manage reviewers",
    },
  },
  PageHeader: () => <div data-testid="page-header" />,
}));

jest.mock("@/components/Generic/RoleManagement/RoleManagementTab", () => ({
  RoleManagementTab: (props: { canManage?: boolean }) => {
    mockRoleManagementTab(props);
    return (
      <div data-testid="role-management-tab" data-can-manage={String(Boolean(props.canManage))} />
    );
  },
}));

// Intentionally mocked to ensure access logic does not rely on this hook.
jest.mock("@/hooks/communities/useIsCommunityAdmin", () => ({
  useIsCommunityAdmin: jest.fn(() => ({
    isCommunityAdmin: false,
    isLoading: false,
  })),
}));

function createReviewersHookResult(data: Array<Record<string, string>> = []) {
  return {
    data,
    isLoading: false,
    refetch: jest.fn(),
    addReviewer: jest.fn(),
    removeReviewer: jest.fn(),
  };
}

describe("ReviewerManagementTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockCan.mockReturnValue(false);

    mockUsePermissionContext.mockReturnValue({
      can: mockCan,
      isLoading: false,
      isGuestDueToError: false,
    });

    mockUseProgramReviewers.mockReturnValue(createReviewersHookResult());
    mockUseMilestoneReviewers.mockReturnValue(createReviewersHookResult());
  });

  it("shows permission denied message when missing manage reviewers permission", () => {
    render(<ReviewerManagementTab programId="program-1" />);

    expect(
      screen.getByText("You don't have permission to manage reviewers for this program.")
    ).toBeInTheDocument();
    expect(screen.queryByTestId("role-management-tab")).not.toBeInTheDocument();
    expect(mockCan).toHaveBeenCalledWith(Permission.PROGRAM_MANAGE_REVIEWERS);
  });

  it("shows verification error when permission context fails", () => {
    mockUsePermissionContext.mockReturnValue({
      can: mockCan,
      isLoading: false,
      isGuestDueToError: true,
    });

    render(<ReviewerManagementTab programId="program-1" />);

    expect(
      screen.getByText("Unable to verify your permissions right now. Please refresh and try again.")
    ).toBeInTheDocument();
    expect(
      screen.queryByText("You don't have permission to manage reviewers for this program.")
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("role-management-tab")).not.toBeInTheDocument();
  });

  it("allows reviewer management when program manage reviewers permission is granted", () => {
    mockCan.mockImplementation((permission: Permission) => {
      return permission === Permission.PROGRAM_MANAGE_REVIEWERS;
    });

    render(<ReviewerManagementTab programId="program-1" />);

    expect(
      screen.queryByText("You don't have permission to manage reviewers for this program.")
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("role-management-tab")).toHaveAttribute("data-can-manage", "true");
    expect(mockCan).toHaveBeenCalledWith(Permission.PROGRAM_MANAGE_REVIEWERS);
  });

  it("renders in read-only mode without manage permission", () => {
    render(<ReviewerManagementTab programId="program-1" readOnly />);

    expect(
      screen.queryByText("You don't have permission to manage reviewers for this program.")
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("role-management-tab")).toHaveAttribute("data-can-manage", "false");
  });
});
