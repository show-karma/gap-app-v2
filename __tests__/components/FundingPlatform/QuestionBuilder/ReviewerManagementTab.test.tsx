import { act, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-hot-toast";
import { ReviewerManagementTab } from "@/components/FundingPlatform/QuestionBuilder/ReviewerManagementTab";
import { Permission } from "@/src/core/rbac/types/permission";

const mockCan = vi.fn();
const mockUsePermissionContext = vi.fn();
const mockRoleManagementTab = vi.fn();
const mockUseProgramReviewers = vi.fn();
const mockUseMilestoneReviewers = vi.fn();

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/src/core/rbac/context/permission-context", () => ({
  usePermissionContext: () => mockUsePermissionContext(),
}));

vi.mock("@/hooks/useProgramReviewers", () => ({
  useProgramReviewers: (...args: unknown[]) => mockUseProgramReviewers(...args),
}));

vi.mock("@/hooks/useMilestoneReviewers", () => ({
  useMilestoneReviewers: (...args: unknown[]) => mockUseMilestoneReviewers(...args),
}));

vi.mock("@/components/Utilities/Spinner", () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

vi.mock("@/components/FundingPlatform/PageHeader", () => ({
  PAGE_HEADER_CONTENT: {
    reviewers: {
      title: "Reviewers",
      description: "Manage reviewers",
    },
  },
  PageHeader: () => <div data-testid="page-header" />,
}));

vi.mock("@/components/Generic/RoleManagement/RoleManagementTab", () => ({
  RoleManagementTab: (props: {
    canManage?: boolean;
    selectedRoles?: string[];
    onEditRoles?: (memberId: string, roles: string[]) => Promise<void>;
    members?: Array<{ id: string; roles?: string[] }>;
  }) => {
    mockRoleManagementTab(props);
    return (
      <div
        data-testid="role-management-tab"
        data-can-manage={String(Boolean(props.canManage))}
        data-has-edit-roles={String(Boolean(props.onEditRoles))}
        data-selected-roles={JSON.stringify(props.selectedRoles)}
      />
    );
  },
}));

// Intentionally mocked to ensure access logic does not rely on this hook.
vi.mock("@/hooks/communities/useIsCommunityAdmin", () => ({
  useIsCommunityAdmin: vi.fn(() => ({
    isCommunityAdmin: false,
    isLoading: false,
  })),
}));

function createReviewersHookResult(
  data: Array<Record<string, string | undefined>> = [],
  overrides: Partial<{
    addReviewer: vi.Mock;
    removeReviewer: vi.Mock;
    refetch: vi.Mock;
  }> = {}
) {
  return {
    data,
    isLoading: false,
    refetch: overrides.refetch ?? vi.fn(),
    addReviewer: overrides.addReviewer ?? vi.fn(),
    removeReviewer: overrides.removeReviewer ?? vi.fn(),
  };
}

const mockToast = toast as vi.Mocked<typeof toast>;

describe("ReviewerManagementTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockCan.mockReturnValue(false);

    mockUsePermissionContext.mockReturnValue({
      can: mockCan,
      isLoading: false,
      isGuestDueToError: false,
    });

    mockUseProgramReviewers.mockReturnValue(createReviewersHookResult());
    mockUseMilestoneReviewers.mockReturnValue(createReviewersHookResult());
  });

  describe("permissions", () => {
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
        screen.getByText(
          "Unable to verify your permissions right now. Please refresh and try again."
        )
      ).toBeInTheDocument();
      expect(screen.queryByTestId("role-management-tab")).not.toBeInTheDocument();
    });

    it("allows reviewer management when manage reviewers permission is granted", () => {
      mockCan.mockImplementation((permission: Permission) => {
        return permission === Permission.PROGRAM_MANAGE_REVIEWERS;
      });

      render(<ReviewerManagementTab programId="program-1" />);

      expect(
        screen.queryByText("You don't have permission to manage reviewers for this program.")
      ).not.toBeInTheDocument();
      expect(screen.getByTestId("role-management-tab")).toHaveAttribute("data-can-manage", "true");
    });

    it("renders in read-only mode without manage permission", () => {
      render(<ReviewerManagementTab programId="program-1" readOnly />);

      expect(screen.getByTestId("role-management-tab")).toHaveAttribute("data-can-manage", "false");
    });
  });

  describe("member merging", () => {
    it("combines program and milestone reviewers with the same email into one member", () => {
      mockCan.mockReturnValue(true);
      mockUseProgramReviewers.mockReturnValue(
        createReviewersHookResult([
          {
            name: "Alice",
            email: "alice@example.com",
            telegram: "alice",
            assignedAt: "2024-01-01T00:00:00Z",
          },
        ])
      );
      mockUseMilestoneReviewers.mockReturnValue(
        createReviewersHookResult([
          {
            name: "Alice",
            email: "alice@example.com",
            telegram: "alice",
            assignedAt: "2024-01-02T00:00:00Z",
          },
        ])
      );

      render(<ReviewerManagementTab programId="program-1" />);

      const props = mockRoleManagementTab.mock.calls.at(-1)?.[0] as {
        members: Array<{ id: string; roles?: string[] }>;
      };

      expect(props.members).toHaveLength(1);
      expect(props.members[0].roles).toEqual(["program", "milestone"]);
    });

    it("keeps separate members for different emails", () => {
      mockCan.mockReturnValue(true);
      mockUseProgramReviewers.mockReturnValue(
        createReviewersHookResult([
          {
            name: "Alice",
            email: "alice@example.com",
            telegram: "alice",
            assignedAt: "2024-01-01T00:00:00Z",
          },
        ])
      );
      mockUseMilestoneReviewers.mockReturnValue(
        createReviewersHookResult([
          {
            name: "Bob",
            email: "bob@example.com",
            telegram: "bob",
            assignedAt: "2024-01-02T00:00:00Z",
          },
        ])
      );

      render(<ReviewerManagementTab programId="program-1" />);

      const props = mockRoleManagementTab.mock.calls.at(-1)?.[0] as {
        members: Array<{ id: string; roles?: string[] }>;
      };

      expect(props.members).toHaveLength(2);
      expect(props.members[0].roles).toEqual(["program"]);
      expect(props.members[1].roles).toEqual(["milestone"]);
    });

    it("skips reviewers with undefined email without throwing", () => {
      mockCan.mockReturnValue(true);
      mockUseProgramReviewers.mockReturnValue(
        createReviewersHookResult([
          {
            name: "No Email",
            email: undefined,
            telegram: "",
            assignedAt: "2024-01-01T00:00:00Z",
          },
          {
            name: "Has Email",
            email: "valid@example.com",
            telegram: "",
            assignedAt: "2024-01-01T00:00:00Z",
          },
        ])
      );
      mockUseMilestoneReviewers.mockReturnValue(
        createReviewersHookResult([
          {
            name: "Also No Email",
            email: undefined,
            telegram: "",
            assignedAt: "2024-01-02T00:00:00Z",
          },
        ])
      );

      render(<ReviewerManagementTab programId="program-1" />);

      const props = mockRoleManagementTab.mock.calls.at(-1)?.[0] as {
        members: Array<{ id: string; roles?: string[] }>;
      };

      expect(props.members).toHaveLength(1);
      expect(props.members[0].id).toBe("valid@example.com");
    });

    it("merges case-insensitively by email", () => {
      mockCan.mockReturnValue(true);
      mockUseProgramReviewers.mockReturnValue(
        createReviewersHookResult([
          {
            name: "Alice",
            email: "Alice@Example.com",
            telegram: "alice",
            assignedAt: "2024-01-01T00:00:00Z",
          },
        ])
      );
      mockUseMilestoneReviewers.mockReturnValue(
        createReviewersHookResult([
          {
            name: "Alice",
            email: "alice@example.com",
            telegram: "alice",
            assignedAt: "2024-01-02T00:00:00Z",
          },
        ])
      );

      render(<ReviewerManagementTab programId="program-1" />);

      const props = mockRoleManagementTab.mock.calls.at(-1)?.[0] as {
        members: Array<{ id: string; roles?: string[] }>;
      };

      expect(props.members).toHaveLength(1);
      expect(props.members[0].roles).toEqual(["program", "milestone"]);
    });
  });

  describe("multi-role selection", () => {
    it("passes selectedRoles and onRolesChange to RoleManagementTab", () => {
      mockCan.mockReturnValue(true);

      render(<ReviewerManagementTab programId="program-1" />);

      const props = mockRoleManagementTab.mock.calls.at(-1)?.[0] as {
        selectedRoles: string[];
        onRolesChange: (roles: string[]) => void;
      };

      expect(props.selectedRoles).toEqual(["program"]);
      expect(typeof props.onRolesChange).toBe("function");
    });

    it("passes onEditRoles callback when not read-only", () => {
      mockCan.mockReturnValue(true);

      render(<ReviewerManagementTab programId="program-1" />);

      const el = screen.getByTestId("role-management-tab");
      expect(el).toHaveAttribute("data-has-edit-roles", "true");
    });

    it("does not pass onEditRoles in read-only mode", () => {
      render(<ReviewerManagementTab programId="program-1" readOnly />);

      const el = screen.getByTestId("role-management-tab");
      expect(el).toHaveAttribute("data-has-edit-roles", "false");
    });
  });

  describe("add with multiple roles", () => {
    it("adds reviewer to both program and milestone when both selected", async () => {
      const addProgramReviewer = vi.fn().mockResolvedValue(undefined);
      const addMilestoneReviewer = vi.fn().mockResolvedValue(undefined);
      mockCan.mockReturnValue(true);
      mockUseProgramReviewers.mockReturnValue(
        createReviewersHookResult([], { addReviewer: addProgramReviewer })
      );
      mockUseMilestoneReviewers.mockReturnValue(
        createReviewersHookResult([], { addReviewer: addMilestoneReviewer })
      );

      render(<ReviewerManagementTab programId="program-1" />);

      // Get the onRolesChange and onAdd from props
      const props = mockRoleManagementTab.mock.calls.at(-1)?.[0] as {
        onRolesChange: (roles: string[]) => void;
        onAdd: (data: Record<string, string>) => Promise<void>;
      };

      // Simulate selecting both roles
      act(() => {
        props.onRolesChange(["program", "milestone"]);
      });

      // Get updated props after state change
      const updatedProps = mockRoleManagementTab.mock.calls.at(-1)?.[0] as {
        onAdd: (data: Record<string, string>) => Promise<void>;
      };

      await act(async () => {
        await updatedProps.onAdd({
          email: "test@example.com",
          name: "Test User",
          telegram: "@test",
        });
      });

      expect(addProgramReviewer).toHaveBeenCalledWith({
        email: "test@example.com",
        name: "Test User",
        telegram: "@test",
      });
      expect(addMilestoneReviewer).toHaveBeenCalledWith({
        email: "test@example.com",
        name: "Test User",
        telegram: "@test",
      });
    });
  });

  describe("remove from all roles", () => {
    it("removes reviewer from all assigned roles", async () => {
      const removeProgramReviewer = vi.fn().mockResolvedValue(undefined);
      const removeMilestoneReviewer = vi.fn().mockResolvedValue(undefined);
      mockCan.mockReturnValue(true);
      mockUseProgramReviewers.mockReturnValue(
        createReviewersHookResult(
          [
            {
              name: "Alice",
              email: "alice@example.com",
              telegram: "alice",
              assignedAt: "2024-01-01T00:00:00Z",
            },
          ],
          { removeReviewer: removeProgramReviewer }
        )
      );
      mockUseMilestoneReviewers.mockReturnValue(
        createReviewersHookResult(
          [
            {
              name: "Alice",
              email: "alice@example.com",
              telegram: "alice",
              assignedAt: "2024-01-01T00:00:00Z",
            },
          ],
          { removeReviewer: removeMilestoneReviewer }
        )
      );

      render(<ReviewerManagementTab programId="program-1" />);

      const props = mockRoleManagementTab.mock.calls.at(-1)?.[0] as {
        onRemove: (memberId: string) => Promise<void>;
      };

      await act(async () => {
        await props.onRemove("alice@example.com");
      });

      expect(removeProgramReviewer).toHaveBeenCalledWith("alice@example.com");
      expect(removeMilestoneReviewer).toHaveBeenCalledWith("alice@example.com");
    });

    it("excludes reviewers with empty email from members list", () => {
      mockCan.mockReturnValue(true);
      mockUseProgramReviewers.mockReturnValue(
        createReviewersHookResult([
          {
            name: "No Email Reviewer",
            email: "",
            telegram: "reviewer",
            assignedAt: "2024-01-01T00:00:00Z",
          },
        ])
      );

      render(<ReviewerManagementTab programId="program-1" />);

      const props = mockRoleManagementTab.mock.calls.at(-1)?.[0] as {
        members: Array<{ id: string }>;
      };

      expect(props.members).toHaveLength(0);
    });

    it("shows error when trying to remove a non-existent member", async () => {
      mockCan.mockReturnValue(true);
      mockUseProgramReviewers.mockReturnValue(createReviewersHookResult());

      render(<ReviewerManagementTab programId="program-1" />);

      const props = mockRoleManagementTab.mock.calls.at(-1)?.[0] as {
        onRemove: (memberId: string) => Promise<void>;
      };

      await act(async () => {
        await props.onRemove("nonexistent@example.com");
      });

      expect(mockToast.error).toHaveBeenCalledWith(
        "Reviewer not found. Please refresh and try again."
      );
    });
  });

  describe("remove error propagation", () => {
    it("propagates errors from remove mutations instead of swallowing them", async () => {
      const removeError = new Error("Network failure");
      const removeProgramReviewer = vi.fn().mockRejectedValue(removeError);
      mockCan.mockReturnValue(true);
      mockUseProgramReviewers.mockReturnValue(
        createReviewersHookResult(
          [
            {
              name: "Alice",
              email: "alice@example.com",
              telegram: "alice",
              assignedAt: "2024-01-01T00:00:00Z",
            },
          ],
          { removeReviewer: removeProgramReviewer }
        )
      );
      mockUseMilestoneReviewers.mockReturnValue(createReviewersHookResult());

      render(<ReviewerManagementTab programId="program-1" />);

      const props = mockRoleManagementTab.mock.calls.at(-1)?.[0] as {
        onRemove: (memberId: string) => Promise<void>;
      };

      await expect(
        act(async () => {
          await props.onRemove("alice@example.com");
        })
      ).rejects.toThrow("Network failure");
    });
  });

  describe("edit roles", () => {
    it("adds a role when editing to include a new role", async () => {
      const addMilestoneReviewer = vi.fn().mockResolvedValue(undefined);
      mockCan.mockReturnValue(true);
      mockUseProgramReviewers.mockReturnValue(
        createReviewersHookResult([
          {
            name: "Alice",
            email: "alice@example.com",
            telegram: "alice",
            assignedAt: "2024-01-01T00:00:00Z",
          },
        ])
      );
      mockUseMilestoneReviewers.mockReturnValue(
        createReviewersHookResult([], { addReviewer: addMilestoneReviewer })
      );

      render(<ReviewerManagementTab programId="program-1" />);

      const props = mockRoleManagementTab.mock.calls.at(-1)?.[0] as {
        onEditRoles: (memberId: string, roles: string[]) => Promise<void>;
      };

      await act(async () => {
        await props.onEditRoles("alice@example.com", ["program", "milestone"]);
      });

      // Should add milestone role (program already exists)
      expect(addMilestoneReviewer).toHaveBeenCalledWith({
        name: "Alice",
        email: "alice@example.com",
        telegram: "alice",
        slack: "",
      });
    });

    it("removes a role when editing to exclude an existing role", async () => {
      const removeProgramReviewer = vi.fn().mockResolvedValue(undefined);
      mockCan.mockReturnValue(true);
      mockUseProgramReviewers.mockReturnValue(
        createReviewersHookResult(
          [
            {
              name: "Alice",
              email: "alice@example.com",
              telegram: "alice",
              assignedAt: "2024-01-01T00:00:00Z",
            },
          ],
          { removeReviewer: removeProgramReviewer }
        )
      );
      mockUseMilestoneReviewers.mockReturnValue(
        createReviewersHookResult([
          {
            name: "Alice",
            email: "alice@example.com",
            telegram: "alice",
            assignedAt: "2024-01-01T00:00:00Z",
          },
        ])
      );

      render(<ReviewerManagementTab programId="program-1" />);

      const props = mockRoleManagementTab.mock.calls.at(-1)?.[0] as {
        onEditRoles: (memberId: string, roles: string[]) => Promise<void>;
      };

      await act(async () => {
        // Remove program role, keep only milestone
        await props.onEditRoles("alice@example.com", ["milestone"]);
      });

      expect(removeProgramReviewer).toHaveBeenCalledWith("alice@example.com");
    });
  });
});
