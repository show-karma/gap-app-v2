import { act, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-hot-toast";
import { ReviewerManagementTab } from "@/components/FundingPlatform/QuestionBuilder/ReviewerManagementTab";
import { Permission } from "@/src/core/rbac/types/permission";

const mockCan = jest.fn();
const mockUsePermissionContext = jest.fn();
const mockRoleManagementTab = jest.fn();
const mockUseProgramReviewers = jest.fn();
const mockUseMilestoneReviewers = jest.fn();

jest.mock("react-hot-toast", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

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

function createReviewersHookResult(
  data: Array<Record<string, string | undefined>> = [],
  overrides: Partial<{
    addReviewer: jest.Mock;
    removeReviewer: jest.Mock;
    refetch: jest.Mock;
  }> = {}
) {
  return {
    data,
    isLoading: false,
    refetch: overrides.refetch ?? jest.fn(),
    addReviewer: overrides.addReviewer ?? jest.fn(),
    removeReviewer: overrides.removeReviewer ?? jest.fn(),
  };
}

const mockToast = toast as jest.Mocked<typeof toast>;

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

  it("uses email fallback in member IDs when wallet address is missing", () => {
    mockCan.mockReturnValue(true);
    mockUseProgramReviewers.mockReturnValue(
      createReviewersHookResult([
        {
          name: "Email Reviewer",
          email: "Reviewer@Example.com",
          telegram: "reviewer",
          assignedAt: "2024-01-01T00:00:00Z",
        },
      ])
    );

    render(<ReviewerManagementTab programId="program-1" />);

    const roleTabProps = mockRoleManagementTab.mock.calls.at(-1)?.[0] as {
      members: Array<{ id: string }>;
    };
    expect(roleTabProps.members[0].id).toBe("program-reviewer@example.com");
  });

  it("blocks remove when wallet address is not available yet", async () => {
    const removeProgramReviewer = jest.fn().mockResolvedValue(undefined);
    mockCan.mockReturnValue(true);
    mockUseProgramReviewers.mockReturnValue(
      createReviewersHookResult(
        [
          {
            name: "Email Reviewer",
            email: "reviewer@example.com",
            telegram: "reviewer",
            assignedAt: "2024-01-01T00:00:00Z",
          },
        ],
        { removeReviewer: removeProgramReviewer }
      )
    );

    render(<ReviewerManagementTab programId="program-1" />);

    const roleTabProps = mockRoleManagementTab.mock.calls.at(-1)?.[0] as {
      onRemove: (memberId: string) => Promise<void>;
    };

    await act(async () => {
      await roleTabProps.onRemove("program-reviewer@example.com");
    });

    expect(removeProgramReviewer).not.toHaveBeenCalled();
    expect(mockToast.error).toHaveBeenCalledWith(
      "This reviewer is still being provisioned. Refresh and try again."
    );
  });

  it("removes reviewers using wallet address from member data", async () => {
    const removeProgramReviewer = jest.fn().mockResolvedValue(undefined);
    mockCan.mockReturnValue(true);
    mockUseProgramReviewers.mockReturnValue(
      createReviewersHookResult(
        [
          {
            publicAddress: "0x1234567890123456789012345678901234567890",
            name: "Wallet Reviewer",
            email: "wallet@example.com",
            telegram: "wallet",
            assignedAt: "2024-01-01T00:00:00Z",
          },
        ],
        { removeReviewer: removeProgramReviewer }
      )
    );

    render(<ReviewerManagementTab programId="program-1" />);

    const roleTabProps = mockRoleManagementTab.mock.calls.at(-1)?.[0] as {
      members: Array<{ id: string }>;
      onRemove: (memberId: string) => Promise<void>;
    };

    await act(async () => {
      await roleTabProps.onRemove(roleTabProps.members[0].id);
    });

    expect(removeProgramReviewer).toHaveBeenCalledWith(
      "0x1234567890123456789012345678901234567890"
    );
  });
});
