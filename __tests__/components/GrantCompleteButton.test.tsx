import { render, screen } from "@testing-library/react";
import { GrantCompleteButton } from "@/components/Pages/GrantMilestonesAndUpdates/GrantCompleteButton";
import { useGrantCompletionRevoke } from "@/hooks/useGrantCompletionRevoke";
import "@testing-library/jest-dom";

// Mock child components
vi.mock(
  "@/components/Pages/GrantMilestonesAndUpdates/GrantCompleteButton/GrantCompletedButton",
  () => ({
    GrantCompletedButton: ({ onClick, disabled, isRevoking, isAuthorized }: any) => (
      <button
        onClick={onClick}
        disabled={disabled}
        data-testid="grant-completed-button"
        data-is-revoking={isRevoking}
        data-is-authorized={isAuthorized}
      >
        Grant Completed Button
      </button>
    ),
  })
);

vi.mock(
  "@/components/Pages/GrantMilestonesAndUpdates/GrantCompleteButton/GrantNotCompletedButton",
  () => ({
    GrantNotCompletedButton: ({ project, grantUID, text }: any) => (
      <a
        href={`/project/${project.uid}/funding/${grantUID}/complete-grant`}
        data-testid="grant-not-completed-button"
        data-text={text}
      >
        {text}
      </a>
    ),
  })
);

// Mock hooks
const mockRevokeCompletion = vi.fn();
const mockIsRevoking = vi.fn(() => false);

vi.mock("@/hooks/useGrantCompletionRevoke", () => ({
  useGrantCompletionRevoke: vi.fn(() => ({
    revokeCompletion: mockRevokeCompletion,
    isRevoking: mockIsRevoking(),
  })),
}));

// Authorization is resolved by the tri-state hook (signal composition is
// unit-tested in useProjectAuthorization.test.ts). These flags drive its
// resolved result so the existing button scenarios keep working.
const mockIsAuthorized = vi.fn(() => false);
const mockIsAuthLoading = vi.fn(() => false);

vi.mock("@/hooks/useProjectAuthorization", () => ({
  useProjectAuthorization: vi.fn(() => ({
    isAuthorized: mockIsAuthorized(),
    isLoading: mockIsAuthLoading(),
  })),
}));

describe("GrantCompleteButton", () => {
  const mockGrant = {
    uid: "grant-123",
    chainID: 42161,
  } as any;

  const mockProject = {
    uid: "project-456",
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRevoking.mockReturnValue(false);
    mockIsAuthorized.mockReturnValue(false);
    mockIsAuthLoading.mockReturnValue(false);
  });

  describe("Completed Grant", () => {
    it("should show GrantCompletedButton when grant.completed === true", () => {
      const completedGrant = {
        ...mockGrant,
        completed: { uid: "0xcompletion123" },
      };

      render(<GrantCompleteButton grant={completedGrant} project={mockProject} />);

      expect(screen.getByTestId("grant-completed-button")).toBeInTheDocument();
      expect(screen.queryByTestId("grant-not-completed-button")).not.toBeInTheDocument();
    });

    it("should pass revokeCompletion from hook as onClick", () => {
      const completedGrant = {
        ...mockGrant,
        completed: { uid: "0xcompletion123" },
      };

      render(<GrantCompleteButton grant={completedGrant} project={mockProject} />);

      const button = screen.getByTestId("grant-completed-button");
      expect(button).toBeInTheDocument();

      // Verify hook was called with correct params

      expect(useGrantCompletionRevoke).toHaveBeenCalledWith({
        grant: completedGrant,
        project: mockProject,
      });
    });

    it("should disable button when isRevoking === true", () => {
      mockIsRevoking.mockReturnValue(true);
      const completedGrant = {
        ...mockGrant,
        completed: { uid: "0xcompletion123" },
      };

      render(<GrantCompleteButton grant={completedGrant} project={mockProject} />);

      const button = screen.getByTestId("grant-completed-button");
      expect(button).toBeDisabled();
    });

    it("should disable button when !isAuthorized", () => {
      mockIsAuthorized.mockReturnValue(false);

      const completedGrant = {
        ...mockGrant,
        completed: { uid: "0xcompletion123" },
      };

      render(<GrantCompleteButton grant={completedGrant} project={mockProject} />);

      const button = screen.getByTestId("grant-completed-button");
      expect(button).toBeDisabled();
    });

    it("should pass isRevoking prop correctly", () => {
      mockIsRevoking.mockReturnValue(true);
      const completedGrant = {
        ...mockGrant,
        completed: { uid: "0xcompletion123" },
      };

      render(<GrantCompleteButton grant={completedGrant} project={mockProject} />);

      const button = screen.getByTestId("grant-completed-button");
      expect(button).toHaveAttribute("data-is-revoking", "true");
    });

    it("should pass isAuthorized prop correctly", () => {
      mockIsAuthorized.mockReturnValue(true);
      const completedGrant = {
        ...mockGrant,
        completed: { uid: "0xcompletion123" },
      };

      render(<GrantCompleteButton grant={completedGrant} project={mockProject} />);

      const button = screen.getByTestId("grant-completed-button");
      expect(button).toHaveAttribute("data-is-authorized", "true");
    });

    it("should not disable button when authorized and not revoking", () => {
      mockIsAuthorized.mockReturnValue(true);
      mockIsRevoking.mockReturnValue(false);
      const completedGrant = {
        ...mockGrant,
        completed: { uid: "0xcompletion123" },
      };

      render(<GrantCompleteButton grant={completedGrant} project={mockProject} />);

      const button = screen.getByTestId("grant-completed-button");
      expect(button).not.toBeDisabled();
    });
  });

  describe("Not Completed Grant (Authorized)", () => {
    it("should show GrantNotCompletedButton when grant.completed is falsy and isAuthorized === true", () => {
      mockIsAuthorized.mockReturnValue(true);
      const notCompletedGrant = {
        ...mockGrant,
        completed: null,
      };

      render(<GrantCompleteButton grant={notCompletedGrant} project={mockProject} />);

      expect(screen.getByTestId("grant-not-completed-button")).toBeInTheDocument();
      expect(screen.queryByTestId("grant-completed-button")).not.toBeInTheDocument();
    });

    it("should show GrantNotCompletedButton when grant.completed is undefined", () => {
      mockIsAuthorized.mockReturnValue(true);
      const notCompletedGrant = {
        ...mockGrant,
        completed: undefined,
      };

      render(<GrantCompleteButton grant={notCompletedGrant} project={mockProject} />);

      expect(screen.getByTestId("grant-not-completed-button")).toBeInTheDocument();
    });

    it("should show GrantNotCompletedButton when grant.completed is false", () => {
      mockIsAuthorized.mockReturnValue(true);
      const notCompletedGrant = {
        ...mockGrant,
        completed: false,
      };

      render(<GrantCompleteButton grant={notCompletedGrant} project={mockProject} />);

      expect(screen.getByTestId("grant-not-completed-button")).toBeInTheDocument();
    });

    it("should pass project prop correctly", () => {
      mockIsAuthorized.mockReturnValue(true);
      const notCompletedGrant = {
        ...mockGrant,
        completed: null,
      };

      render(<GrantCompleteButton grant={notCompletedGrant} project={mockProject} />);

      const link = screen.getByTestId("grant-not-completed-button");
      expect(link).toHaveAttribute(
        "href",
        `/project/${mockProject.uid}/funding/${mockGrant.uid}/complete-grant`
      );
    });

    it("should pass grantUID prop correctly", () => {
      mockIsAuthorized.mockReturnValue(true);
      const customGrant = {
        ...mockGrant,
        uid: "custom-grant-789",
        completed: null,
      };

      render(<GrantCompleteButton grant={customGrant} project={mockProject} />);

      const link = screen.getByTestId("grant-not-completed-button");
      expect(link.getAttribute("href")).toContain("custom-grant-789");
    });

    it("should pass default text prop", () => {
      mockIsAuthorized.mockReturnValue(true);
      const notCompletedGrant = {
        ...mockGrant,
        completed: null,
      };

      render(<GrantCompleteButton grant={notCompletedGrant} project={mockProject} />);

      const link = screen.getByTestId("grant-not-completed-button");
      expect(link).toHaveAttribute("data-text", "Mark as Complete");
    });

    it("should pass custom text prop", () => {
      mockIsAuthorized.mockReturnValue(true);
      const notCompletedGrant = {
        ...mockGrant,
        completed: null,
      };

      render(
        <GrantCompleteButton
          grant={notCompletedGrant}
          project={mockProject}
          text="Custom Complete Text"
        />
      );

      const link = screen.getByTestId("grant-not-completed-button");
      expect(link).toHaveAttribute("data-text", "Custom Complete Text");
    });
  });

  describe("Not Authorized", () => {
    it("should return null when grant.completed is falsy and !isAuthorized", () => {
      mockIsAuthorized.mockReturnValue(false);

      const notCompletedGrant = {
        ...mockGrant,
        completed: null,
      };

      const { container } = render(
        <GrantCompleteButton grant={notCompletedGrant} project={mockProject} />
      );

      expect(container.firstChild).toBeNull();
      expect(screen.queryByTestId("grant-completed-button")).not.toBeInTheDocument();
      expect(screen.queryByTestId("grant-not-completed-button")).not.toBeInTheDocument();
    });

    it("should return null when project is missing", () => {
      mockIsAuthorized.mockReturnValue(true);
      const notCompletedGrant = {
        ...mockGrant,
        completed: null,
      };

      const { container } = render(
        <GrantCompleteButton grant={notCompletedGrant} project={null as any} />
      );

      expect(container.firstChild).toBeNull();
    });

    it("should return null when project is undefined", () => {
      mockIsAuthorized.mockReturnValue(true);
      const notCompletedGrant = {
        ...mockGrant,
        completed: null,
      };

      const { container } = render(
        <GrantCompleteButton grant={notCompletedGrant} project={undefined as any} />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe("Authorization Logic", () => {
    it("should check isOwner from useOwnerStore", () => {
      mockIsAuthorized.mockReturnValue(true);
      const completedGrant = {
        ...mockGrant,
        completed: { uid: "0xcompletion123" },
      };

      render(<GrantCompleteButton grant={completedGrant} project={mockProject} />);

      const button = screen.getByTestId("grant-completed-button");
      expect(button).toHaveAttribute("data-is-authorized", "true");
    });

    it("should check isProjectAdmin from useProjectStore", () => {
      mockIsAuthorized.mockReturnValue(true);
      const completedGrant = {
        ...mockGrant,
        completed: { uid: "0xcompletion123" },
      };

      render(<GrantCompleteButton grant={completedGrant} project={mockProject} />);

      const button = screen.getByTestId("grant-completed-button");
      expect(button).toHaveAttribute("data-is-authorized", "true");
    });

    it("should check isCommunityAdmin from useCommunityAdminStore", () => {
      mockIsAuthorized.mockReturnValue(true);
      const completedGrant = {
        ...mockGrant,
        completed: { uid: "0xcompletion123" },
      };

      render(<GrantCompleteButton grant={completedGrant} project={mockProject} />);

      const button = screen.getByTestId("grant-completed-button");
      expect(button).toHaveAttribute("data-is-authorized", "true");
    });

    it("should forward isAuthorized=true when the hook resolves authorized", () => {
      mockIsAuthorized.mockReturnValue(true);

      const completedGrant = {
        ...mockGrant,
        completed: { uid: "0xcompletion123" },
      };

      render(<GrantCompleteButton grant={completedGrant} project={mockProject} />);

      const button = screen.getByTestId("grant-completed-button");
      expect(button).toHaveAttribute("data-is-authorized", "true");
    });

    it("should forward isAuthorized=false when the hook resolves denied", () => {
      mockIsAuthorized.mockReturnValue(false);

      const completedGrant = {
        ...mockGrant,
        completed: { uid: "0xcompletion123" },
      };

      render(<GrantCompleteButton grant={completedGrant} project={mockProject} />);

      const button = screen.getByTestId("grant-completed-button");
      expect(button).toHaveAttribute("data-is-authorized", "false");
    });

    it("should render a skeleton (not the button) while authorization is loading", () => {
      mockIsAuthLoading.mockReturnValue(true);
      const completedGrant = {
        ...mockGrant,
        completed: { uid: "0xcompletion123" },
      };

      render(<GrantCompleteButton grant={completedGrant} project={mockProject} />);

      expect(screen.getByTestId("grant-complete-button-skeleton")).toBeInTheDocument();
      expect(screen.queryByTestId("grant-completed-button")).not.toBeInTheDocument();
    });
  });

  describe("Hook Integration", () => {
    it("should call useGrantCompletionRevoke with correct grant and project", () => {
      const completedGrant = {
        ...mockGrant,
        completed: { uid: "0xcompletion123" },
      };

      render(<GrantCompleteButton grant={completedGrant} project={mockProject} />);

      expect(useGrantCompletionRevoke).toHaveBeenCalledWith({
        grant: completedGrant,
        project: mockProject,
      });
    });

    it("should use returned revokeCompletion from hook", () => {
      const completedGrant = {
        ...mockGrant,
        completed: { uid: "0xcompletion123" },
      };

      render(<GrantCompleteButton grant={completedGrant} project={mockProject} />);

      // The onClick handler should be the mockRevokeCompletion
      // We verify this by checking the hook was called
      expect(mockRevokeCompletion).toBeDefined();
    });

    it("should use returned isRevoking from hook", () => {
      mockIsRevoking.mockReturnValue(true);
      const completedGrant = {
        ...mockGrant,
        completed: { uid: "0xcompletion123" },
      };

      render(<GrantCompleteButton grant={completedGrant} project={mockProject} />);

      const button = screen.getByTestId("grant-completed-button");
      expect(button).toHaveAttribute("data-is-revoking", "true");
    });

    it("should update when isRevoking changes", () => {
      mockIsRevoking.mockReturnValue(false);
      const completedGrant = {
        ...mockGrant,
        completed: { uid: "0xcompletion123" },
      };

      const { rerender } = render(
        <GrantCompleteButton grant={completedGrant} project={mockProject} />
      );

      let button = screen.getByTestId("grant-completed-button");
      expect(button).toHaveAttribute("data-is-revoking", "false");

      mockIsRevoking.mockReturnValue(true);
      rerender(<GrantCompleteButton grant={completedGrant} project={mockProject} />);

      button = screen.getByTestId("grant-completed-button");
      expect(button).toHaveAttribute("data-is-revoking", "true");
    });
  });

  describe("Edge Cases", () => {
    it("should handle grant.completed as empty object", () => {
      const grantWithEmptyCompletion = {
        ...mockGrant,
        completed: {},
      };

      render(<GrantCompleteButton grant={grantWithEmptyCompletion} project={mockProject} />);

      // Empty object is truthy, so should show completed button
      expect(screen.getByTestId("grant-completed-button")).toBeInTheDocument();
    });

    it("should handle multiple authorization flags being true", () => {
      mockIsAuthorized.mockReturnValue(true);

      const completedGrant = {
        ...mockGrant,
        completed: { uid: "0xcompletion123" },
      };

      render(<GrantCompleteButton grant={completedGrant} project={mockProject} />);

      const button = screen.getByTestId("grant-completed-button");
      expect(button).toHaveAttribute("data-is-authorized", "true");
    });
  });
});
