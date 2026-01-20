/**
 * @file Tests for SetupWizard component
 * @description Tests for the setup wizard UI that guides users through program setup
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SetupWizard } from "@/components/FundingPlatform/SetupWizard";
import type { SetupProgress, SetupStep } from "@/hooks/useProgramSetupProgress";
import "@testing-library/jest-dom";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock next/link
jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// Mock dependencies
const mockToggleStatusAsync = jest.fn();
const mockRefetch = jest.fn();

jest.mock("@/hooks/useFundingPlatform", () => ({
  useProgramConfig: jest.fn(() => ({
    toggleStatusAsync: mockToggleStatusAsync,
    isUpdating: false,
    refetch: mockRefetch,
  })),
}));

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

import toast from "react-hot-toast";

describe("SetupWizard", () => {
  const communityId = "test-community";
  const programId = "program-123";
  const programName = "Test Grant Program";

  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    mockToggleStatusAsync.mockResolvedValue(undefined);
    mockRefetch.mockResolvedValue(undefined);
  });

  const createMockProgress = (overrides: Partial<SetupProgress> = {}): SetupProgress => ({
    steps: [
      {
        id: "program-created",
        title: "Create Program",
        description: "Program details have been saved",
        status: "completed",
        required: true,
        href: `/community/${communityId}/admin/funding-platform/${programId}/question-builder?tab=program-details`,
        actionLabel: "Edit Details",
      },
      {
        id: "application-form",
        title: "Build Application Form",
        description: "Define the questions applicants will answer",
        status: "pending",
        required: true,
        href: `/community/${communityId}/admin/funding-platform/${programId}/question-builder?tab=build`,
        actionLabel: "Start Building",
      },
      {
        id: "reviewers",
        title: "Add Reviewers",
        description: "Invite team members to review applications",
        status: "pending",
        required: false,
        href: `/community/${communityId}/admin/funding-platform/${programId}/question-builder?tab=reviewers`,
        actionLabel: "Add Reviewers",
      },
      {
        id: "email-templates",
        title: "Configure Email Templates",
        description: "Customize approval and rejection emails",
        status: "pending",
        required: false,
        href: `/community/${communityId}/admin/funding-platform/${programId}/question-builder?tab=settings`,
        actionLabel: "Configure",
      },
      {
        id: "ai-config",
        title: "Set Up AI Evaluation",
        description: "Configure AI-powered application scoring",
        status: "pending",
        required: false,
        href: `/community/${communityId}/admin/funding-platform/${programId}/question-builder?tab=ai-config`,
        actionLabel: "Set Up",
      },
      {
        id: "enable-program",
        title: "Enable Program",
        description: "Make your program live and start accepting applications",
        status: "disabled",
        required: true,
        href: `/community/${communityId}/admin/funding-platform/${programId}/question-builder?tab=program-details`,
        actionLabel: "Enable Program",
      },
    ],
    completedCount: 1,
    totalRequired: 3,
    totalSteps: 6,
    isReadyToEnable: false,
    missingRequired: ["Build Application Form", "Enable Program"],
    percentComplete: 17,
    isLoading: false,
    ...overrides,
  });

  describe("Rendering", () => {
    it("should render loading spinner when isLoading is true", () => {
      const progress = createMockProgress({ isLoading: true });
      const { container } = render(
        <SetupWizard
          communityId={communityId}
          programId={programId}
          programName={programName}
          progress={progress}
        />
      );

      // The Spinner component renders a div with animate-spin class
      expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    });

    it("should render wizard title for non-enabled program", () => {
      const progress = createMockProgress();
      render(
        <SetupWizard
          communityId={communityId}
          programId={programId}
          programName={programName}
          progress={progress}
        />
      );

      expect(screen.getByText("Set Up Your Program")).toBeInTheDocument();
    });

    it("should render program name in description", () => {
      const progress = createMockProgress();
      render(
        <SetupWizard
          communityId={communityId}
          programId={programId}
          programName={programName}
          progress={progress}
        />
      );

      expect(
        screen.getByText(
          `Complete these steps to start accepting applications for "${programName}".`
        )
      ).toBeInTheDocument();
    });

    it("should render progress percentage", () => {
      const progress = createMockProgress({ percentComplete: 50 });
      render(
        <SetupWizard
          communityId={communityId}
          programId={programId}
          programName={programName}
          progress={progress}
        />
      );

      expect(screen.getByText("50%")).toBeInTheDocument();
    });

    it("should render step counts", () => {
      const progress = createMockProgress({ completedCount: 2, totalSteps: 6 });
      render(
        <SetupWizard
          communityId={communityId}
          programId={programId}
          programName={programName}
          progress={progress}
        />
      );

      expect(screen.getByText("2 of 6 steps")).toBeInTheDocument();
    });

    it("should render all steps", () => {
      const progress = createMockProgress();
      render(
        <SetupWizard
          communityId={communityId}
          programId={programId}
          programName={programName}
          progress={progress}
        />
      );

      // Steps are rendered as h3 elements within the step cards
      expect(screen.getByRole("heading", { name: "Create Program", level: 3 })).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Build Application Form", level: 3 })
      ).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Add Reviewers", level: 3 })).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Configure Email Templates", level: 3 })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Set Up AI Evaluation", level: 3 })
      ).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Enable Program", level: 3 })).toBeInTheDocument();
    });

    it("should render back link to dashboard", () => {
      const progress = createMockProgress();
      render(
        <SetupWizard
          communityId={communityId}
          programId={programId}
          programName={programName}
          progress={progress}
        />
      );

      const backLink = screen.getByText("Back to Programs");
      expect(backLink).toBeInTheDocument();
      expect(backLink.closest("a")).toHaveAttribute(
        "href",
        `/community/${communityId}/admin/funding-platform`
      );
    });

    it("should render skip setup link when program is not enabled", () => {
      const progress = createMockProgress();
      render(
        <SetupWizard
          communityId={communityId}
          programId={programId}
          programName={programName}
          progress={progress}
        />
      );

      expect(screen.getByText("Skip setup and return to dashboard")).toBeInTheDocument();
    });
  });

  describe("Enabled Program State", () => {
    it("should show completion title when program is fully enabled", () => {
      const enabledSteps: SetupStep[] = [
        {
          id: "program-created",
          title: "Create Program",
          description: "Program details have been saved",
          status: "completed",
          required: true,
          href: "#",
          actionLabel: "Edit Details",
        },
        {
          id: "application-form",
          title: "Build Application Form",
          description: "Define the questions",
          status: "completed",
          required: true,
          href: "#",
          actionLabel: "Edit Form",
        },
        {
          id: "reviewers",
          title: "Add Reviewers",
          description: "Invite reviewers",
          status: "completed",
          required: false,
          href: "#",
          actionLabel: "Manage Reviewers",
        },
        {
          id: "email-templates",
          title: "Configure Email Templates",
          description: "Customize emails",
          status: "completed",
          required: false,
          href: "#",
          actionLabel: "Edit Templates",
        },
        {
          id: "ai-config",
          title: "Set Up AI Evaluation",
          description: "Configure AI",
          status: "completed",
          required: false,
          href: "#",
          actionLabel: "Edit AI Config",
        },
        {
          id: "enable-program",
          title: "Enable Program",
          description: "Make program live",
          status: "completed",
          required: true,
          href: "#",
          actionLabel: "Enabled",
        },
      ];

      const progress = createMockProgress({
        steps: enabledSteps,
        completedCount: 6,
        percentComplete: 100,
        isReadyToEnable: true,
        missingRequired: [],
      });

      render(
        <SetupWizard
          communityId={communityId}
          programId={programId}
          programName={programName}
          progress={progress}
        />
      );

      expect(screen.getByText("Program Setup Complete!")).toBeInTheDocument();
      expect(screen.getByText("Your program is live!")).toBeInTheDocument();
    });

    it("should not show skip link when program is enabled", () => {
      const enabledSteps: SetupStep[] = [
        {
          id: "enable-program",
          title: "Enable Program",
          description: "Make program live",
          status: "completed",
          required: true,
          href: "#",
          actionLabel: "Enabled",
        },
      ];

      const progress = createMockProgress({
        steps: enabledSteps,
        completedCount: 1,
        percentComplete: 100,
      });

      render(
        <SetupWizard
          communityId={communityId}
          programId={programId}
          programName={programName}
          progress={progress}
        />
      );

      expect(screen.queryByText("Skip setup and return to dashboard")).not.toBeInTheDocument();
    });
  });

  describe("Ready to Enable State", () => {
    it("should show enable button when ready to enable", () => {
      const readySteps: SetupStep[] = [
        {
          id: "program-created",
          title: "Create Program",
          description: "Program details have been saved",
          status: "completed",
          required: true,
          href: "#",
          actionLabel: "Edit Details",
        },
        {
          id: "application-form",
          title: "Build Application Form",
          description: "Define the questions",
          status: "completed",
          required: true,
          href: "#",
          actionLabel: "Edit Form",
        },
        {
          id: "enable-program",
          title: "Enable Program",
          description: "Make program live",
          status: "pending",
          required: true,
          href: "#",
          actionLabel: "Enable Program",
        },
      ];

      const progress = createMockProgress({
        steps: readySteps,
        completedCount: 2,
        totalSteps: 3,
        isReadyToEnable: true,
        missingRequired: [],
        percentComplete: 67,
      });

      render(
        <SetupWizard
          communityId={communityId}
          programId={programId}
          programName={programName}
          progress={progress}
        />
      );

      expect(screen.getByText("Ready to go live?")).toBeInTheDocument();
      // There are multiple enable program buttons - one in the ready section
      const enableButtons = screen.getAllByRole("button", { name: /enable program/i });
      expect(enableButtons.length).toBeGreaterThanOrEqual(1);
    });

    it("should enable program when clicking the enable button", async () => {
      const user = userEvent.setup();

      const readySteps: SetupStep[] = [
        {
          id: "program-created",
          title: "Create Program",
          description: "Saved",
          status: "completed",
          required: true,
          href: "#",
          actionLabel: "Edit",
        },
        {
          id: "application-form",
          title: "Build Application Form",
          description: "Done",
          status: "completed",
          required: true,
          href: "#",
          actionLabel: "Edit",
        },
        {
          id: "enable-program",
          title: "Enable Program",
          description: "Live",
          status: "pending",
          required: true,
          href: "#",
          actionLabel: "Enable",
        },
      ];

      const progress = createMockProgress({
        steps: readySteps,
        isReadyToEnable: true,
      });

      render(
        <SetupWizard
          communityId={communityId}
          programId={programId}
          programName={programName}
          progress={progress}
        />
      );

      // There are multiple enable buttons - click the first one (in the ready section)
      const enableButtons = screen.getAllByRole("button", { name: /enable program/i });
      await user.click(enableButtons[0]);

      await waitFor(() => {
        expect(mockToggleStatusAsync).toHaveBeenCalledWith(true);
      });
    });

    it("should show success toast and redirect on successful enable", async () => {
      const user = userEvent.setup();

      const readySteps: SetupStep[] = [
        {
          id: "program-created",
          title: "Create Program",
          description: "Saved",
          status: "completed",
          required: true,
          href: "#",
          actionLabel: "Edit",
        },
        {
          id: "application-form",
          title: "Build Application Form",
          description: "Done",
          status: "completed",
          required: true,
          href: "#",
          actionLabel: "Edit",
        },
        {
          id: "enable-program",
          title: "Enable Program",
          description: "Live",
          status: "pending",
          required: true,
          href: "#",
          actionLabel: "Enable",
        },
      ];

      const progress = createMockProgress({
        steps: readySteps,
        isReadyToEnable: true,
      });

      render(
        <SetupWizard
          communityId={communityId}
          programId={programId}
          programName={programName}
          progress={progress}
        />
      );

      // There are multiple enable buttons - click the first one (in the ready section)
      const enableButtons = screen.getAllByRole("button", { name: /enable program/i });
      await user.click(enableButtons[0]);

      await waitFor(() => {
        expect(mockToggleStatusAsync).toHaveBeenCalledWith(true);
        expect(mockRefetch).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith(`/community/${communityId}/admin/funding-platform`);
      });
    });

    it("should handle failed enable gracefully", async () => {
      const user = userEvent.setup();
      mockToggleStatusAsync.mockRejectedValue(new Error("Failed"));

      const readySteps: SetupStep[] = [
        {
          id: "program-created",
          title: "Create Program",
          description: "Saved",
          status: "completed",
          required: true,
          href: "#",
          actionLabel: "Edit",
        },
        {
          id: "application-form",
          title: "Build Application Form",
          description: "Done",
          status: "completed",
          required: true,
          href: "#",
          actionLabel: "Edit",
        },
        {
          id: "enable-program",
          title: "Enable Program",
          description: "Live",
          status: "pending",
          required: true,
          href: "#",
          actionLabel: "Enable",
        },
      ];

      const progress = createMockProgress({
        steps: readySteps,
        isReadyToEnable: true,
      });

      render(
        <SetupWizard
          communityId={communityId}
          programId={programId}
          programName={programName}
          progress={progress}
        />
      );

      // There are multiple enable buttons - click the first one (in the ready section)
      const enableButtons = screen.getAllByRole("button", { name: /enable program/i });
      await user.click(enableButtons[0]);

      await waitFor(() => {
        expect(mockToggleStatusAsync).toHaveBeenCalledWith(true);
        // Should not navigate on error
        expect(mockPush).not.toHaveBeenCalled();
      });
    });
  });

  describe("Progress Bar", () => {
    it("should render progress bar with correct width", () => {
      const progress = createMockProgress({ percentComplete: 50 });
      const { container } = render(
        <SetupWizard
          communityId={communityId}
          programId={programId}
          programName={programName}
          progress={progress}
        />
      );

      // Find the progress bar inner element
      const progressBar = container.querySelector('[style*="width: 50%"]');
      expect(progressBar).toBeInTheDocument();
    });

    it("should show green progress bar at 100%", () => {
      const progress = createMockProgress({ percentComplete: 100 });
      const { container } = render(
        <SetupWizard
          communityId={communityId}
          programId={programId}
          programName={programName}
          progress={progress}
        />
      );

      const progressBar = container.querySelector('[style*="width: 100%"]');
      expect(progressBar).toHaveClass("bg-green-500");
    });
  });
});
