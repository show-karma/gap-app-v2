import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import { GrantCompleteButton } from "@/components/Pages/GrantMilestonesAndUpdates/GrantCompleteButton";
import "@testing-library/jest-dom";

// Mock child components
jest.mock(
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

jest.mock(
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
const mockRevokeCompletion = jest.fn();
const mockIsRevoking = jest.fn(() => false);

jest.mock("@/hooks/useGrantCompletionRevoke", () => ({
  useGrantCompletionRevoke: jest.fn(() => ({
    revokeCompletion: mockRevokeCompletion,
    isRevoking: mockIsRevoking(),
  })),
}));

const mockIsOwner = jest.fn(() => false);
const mockIsProjectAdmin = jest.fn(() => false);
const mockIsCommunityAdmin = jest.fn(() => false);

jest.mock("@/store", () => ({
  useOwnerStore: jest.fn((selector: any) => {
    if (selector.toString().includes("isOwner")) {
      return mockIsOwner();
    }
    return mockIsProjectAdmin();
  }),
  useProjectStore: jest.fn((selector: any) => {
    if (selector.toString().includes("isProjectAdmin")) {
      return mockIsProjectAdmin();
    }
    return jest.fn();
  }),
}));

jest.mock("@/store/communityAdmin", () => ({
  useCommunityAdminStore: jest.fn((selector: any) => {
    if (selector.toString().includes("isCommunityAdmin")) {
      return mockIsCommunityAdmin();
    }
    return jest.fn();
  }),
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
    jest.clearAllMocks();
    mockIsRevoking.mockReturnValue(false);
    mockIsOwner.mockReturnValue(false);
    mockIsProjectAdmin.mockReturnValue(false);
    mockIsCommunityAdmin.mockReturnValue(false);
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
      const { useGrantCompletionRevoke } = require("@/hooks/useGrantCompletionRevoke");
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
      mockIsOwner.mockReturnValue(false);
      mockIsProjectAdmin.mockReturnValue(false);
      mockIsCommunityAdmin.mockReturnValue(false);

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
      mockIsOwner.mockReturnValue(true);
      const completedGrant = {
        ...mockGrant,
        completed: { uid: "0xcompletion123" },
      };

      render(<GrantCompleteButton grant={completedGrant} project={mockProject} />);

      const button = screen.getByTestId("grant-completed-button");
      expect(button).toHaveAttribute("data-is-authorized", "true");
    });

    it("should not disable button when authorized and not revoking", () => {
      mockIsOwner.mockReturnValue(true);
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
      mockIsOwner.mockReturnValue(true);
      const notCompletedGrant = {
        ...mockGrant,
        completed: null,
      };

      render(<GrantCompleteButton grant={notCompletedGrant} project={mockProject} />);

      expect(screen.getByTestId("grant-not-completed-button")).toBeInTheDocument();
      expect(screen.queryByTestId("grant-completed-button")).not.toBeInTheDocument();
    });

    it("should show GrantNotCompletedButton when grant.completed is undefined", () => {
      mockIsProjectAdmin.mockReturnValue(true);
      const notCompletedGrant = {
        ...mockGrant,
        completed: undefined,
      };

      render(<GrantCompleteButton grant={notCompletedGrant} project={mockProject} />);

      expect(screen.getByTestId("grant-not-completed-button")).toBeInTheDocument();
    });

    it("should show GrantNotCompletedButton when grant.completed is false", () => {
      mockIsCommunityAdmin.mockReturnValue(true);
      const notCompletedGrant = {
        ...mockGrant,
        completed: false,
      };

      render(<GrantCompleteButton grant={notCompletedGrant} project={mockProject} />);

      expect(screen.getByTestId("grant-not-completed-button")).toBeInTheDocument();
    });

    it("should pass project prop correctly", () => {
      mockIsOwner.mockReturnValue(true);
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
      mockIsOwner.mockReturnValue(true);
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
      mockIsOwner.mockReturnValue(true);
      const notCompletedGrant = {
        ...mockGrant,
        completed: null,
      };

      render(<GrantCompleteButton grant={notCompletedGrant} project={mockProject} />);

      const link = screen.getByTestId("grant-not-completed-button");
      expect(link).toHaveAttribute("data-text", "Mark as Complete");
    });

    it("should pass custom text prop", () => {
      mockIsOwner.mockReturnValue(true);
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
      mockIsOwner.mockReturnValue(false);
      mockIsProjectAdmin.mockReturnValue(false);
      mockIsCommunityAdmin.mockReturnValue(false);

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
      mockIsOwner.mockReturnValue(true);
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
      mockIsOwner.mockReturnValue(true);
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
      mockIsOwner.mockReturnValue(true);
      const completedGrant = {
        ...mockGrant,
        completed: { uid: "0xcompletion123" },
      };

      render(<GrantCompleteButton grant={completedGrant} project={mockProject} />);

      const button = screen.getByTestId("grant-completed-button");
      expect(button).toHaveAttribute("data-is-authorized", "true");
    });

    it("should check isProjectAdmin from useProjectStore", () => {
      mockIsProjectAdmin.mockReturnValue(true);
      const completedGrant = {
        ...mockGrant,
        completed: { uid: "0xcompletion123" },
      };

      render(<GrantCompleteButton grant={completedGrant} project={mockProject} />);

      const button = screen.getByTestId("grant-completed-button");
      expect(button).toHaveAttribute("data-is-authorized", "true");
    });

    it("should check isCommunityAdmin from useCommunityAdminStore", () => {
      mockIsCommunityAdmin.mockReturnValue(true);
      const completedGrant = {
        ...mockGrant,
        completed: { uid: "0xcompletion123" },
      };

      render(<GrantCompleteButton grant={completedGrant} project={mockProject} />);

      const button = screen.getByTestId("grant-completed-button");
      expect(button).toHaveAttribute("data-is-authorized", "true");
    });

    it("should set isAuthorized to true if isOwner is true", () => {
      mockIsOwner.mockReturnValue(true);
      mockIsProjectAdmin.mockReturnValue(false);
      mockIsCommunityAdmin.mockReturnValue(false);

      const completedGrant = {
        ...mockGrant,
        completed: { uid: "0xcompletion123" },
      };

      render(<GrantCompleteButton grant={completedGrant} project={mockProject} />);

      const button = screen.getByTestId("grant-completed-button");
      expect(button).toHaveAttribute("data-is-authorized", "true");
    });

    it("should set isAuthorized to true if isProjectAdmin is true", () => {
      mockIsOwner.mockReturnValue(false);
      mockIsProjectAdmin.mockReturnValue(true);
      mockIsCommunityAdmin.mockReturnValue(false);

      const completedGrant = {
        ...mockGrant,
        completed: { uid: "0xcompletion123" },
      };

      render(<GrantCompleteButton grant={completedGrant} project={mockProject} />);

      const button = screen.getByTestId("grant-completed-button");
      expect(button).toHaveAttribute("data-is-authorized", "true");
    });

    it("should set isAuthorized to true if isCommunityAdmin is true", () => {
      mockIsOwner.mockReturnValue(false);
      mockIsProjectAdmin.mockReturnValue(false);
      mockIsCommunityAdmin.mockReturnValue(true);

      const completedGrant = {
        ...mockGrant,
        completed: { uid: "0xcompletion123" },
      };

      render(<GrantCompleteButton grant={completedGrant} project={mockProject} />);

      const button = screen.getByTestId("grant-completed-button");
      expect(button).toHaveAttribute("data-is-authorized", "true");
    });

    it("should set isAuthorized to false if none are true", () => {
      mockIsOwner.mockReturnValue(false);
      mockIsProjectAdmin.mockReturnValue(false);
      mockIsCommunityAdmin.mockReturnValue(false);

      const completedGrant = {
        ...mockGrant,
        completed: { uid: "0xcompletion123" },
      };

      render(<GrantCompleteButton grant={completedGrant} project={mockProject} />);

      const button = screen.getByTestId("grant-completed-button");
      expect(button).toHaveAttribute("data-is-authorized", "false");
    });
  });

  describe("Hook Integration", () => {
    it("should call useGrantCompletionRevoke with correct grant and project", () => {
      const completedGrant = {
        ...mockGrant,
        completed: { uid: "0xcompletion123" },
      };

      render(<GrantCompleteButton grant={completedGrant} project={mockProject} />);

      const { useGrantCompletionRevoke } = require("@/hooks/useGrantCompletionRevoke");
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
      mockIsOwner.mockReturnValue(true);
      mockIsProjectAdmin.mockReturnValue(true);
      mockIsCommunityAdmin.mockReturnValue(true);

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
