/**
 * Reviewer Status Change Tests
 * Tests the status change functionality for application reviewers
 *
 * This tests the feature that allows application reviewers and milestone reviewers
 * to change application status from the reviewer detail page.
 */

import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// Define mock functions before mocks
const mockUpdateStatusAsync = vi.fn();
const mockRefetchApplication = vi.fn();
const mockPush = vi.fn();

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useParams: vi.fn(() => ({
    communityId: "test-community",
    programId: "prog-1_1",
    applicationId: "APP-001",
  })),
  useSearchParams: vi.fn(() => ({
    get: vi.fn(() => null),
  })),
  useRouter: vi.fn(() => ({
    push: mockPush,
    back: vi.fn(),
  })),
}));

// Mock next/link
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: any) => React.createElement("a", { href }, children),
}));

// Mock heroicons
vi.mock("@heroicons/react/24/solid", () => ({
  ArrowLeftIcon: () => React.createElement("span", { "data-testid": "arrow-left-icon" }),
  EyeIcon: () => React.createElement("span", { "data-testid": "eye-icon" }),
}));

// Mock toast
// Mock wagmi
vi.mock("wagmi", () => ({
  useAccount: vi.fn(() => ({
    address: "0x1234567890abcdef",
  })),
}));

// Mock store
vi.mock("@/store/applicationVersions", () => ({
  useApplicationVersionsStore: vi.fn(() => ({
    selectVersion: vi.fn(),
  })),
}));

// Mock type guards
vi.mock("@/utilities/type-guards", () => ({
  isFundingProgramConfig: vi.fn(() => true),
}));

// Mock pages
vi.mock("@/utilities/pages", () => ({
  PAGES: {
    REVIEWER: {
      APPLICATIONS: (communityId: string, programId: string) =>
        `/community/${communityId}/manage/funding-platform/${programId}/applications`,
    },
    MANAGE: {
      FUNDING_PLATFORM: {
        APPLICATIONS: (communityId: string, programId: string) =>
          `/community/${communityId}/manage/funding-platform/${programId}/applications`,
        MILESTONES: (communityId: string, programId: string, projectId: string) =>
          `/community/${communityId}/manage/funding-platform/${programId}/milestones/${projectId}`,
      },
    },
  },
}));

// Mock theme
vi.mock("@/src/helper/theme", () => ({
  layoutTheme: {
    padding: "px-4",
  },
}));

// Mock hooks
vi.mock("@/hooks/useFundingPlatform", () => ({
  useApplication: vi.fn(() => ({
    application: {
      id: "test-app-1",
      referenceNumber: "APP-001",
      status: "pending",
      projectUID: null,
      statusHistory: [],
    },
    isLoading: false,
    refetch: mockRefetchApplication,
  })),
  useProgramConfig: vi.fn(() => ({
    data: { id: "prog-1", name: "Test Program" },
  })),
  useApplicationStatus: vi.fn(() => ({
    updateStatusAsync: mockUpdateStatusAsync,
  })),
  useApplicationComments: vi.fn(() => ({
    comments: [],
    isLoading: false,
    createCommentAsync: vi.fn(),
    editCommentAsync: vi.fn(),
    deleteCommentAsync: vi.fn(),
  })),
  useApplicationVersions: vi.fn(() => ({
    versions: [],
  })),
  useDeleteApplication: vi.fn(() => ({
    deleteApplicationAsync: vi.fn(),
    isDeleting: false,
  })),
  useApplicationUpdateV2: vi.fn(() => ({
    updateApplicationAsync: vi.fn(),
    isUpdating: false,
  })),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: vi.fn(() => ({
    hasPermission: true,
    isLoading: false,
  })),
}));

vi.mock("@/hooks/useKycStatus", () => ({
  useKycStatus: vi.fn(() => ({
    status: null,
  })),
  useKycConfig: vi.fn(() => ({
    isEnabled: false,
  })),
}));

vi.mock("@/src/core/rbac", () => {
  const actual = vi.importActual("@/src/core/rbac");
  return {
    ...actual,
    useIsFundingPlatformAdmin: vi.fn(() => false),
    FundingPlatformGuard: ({ children }: any) => children,
    AdminOnly: ({ children }: any) => children,
    Can: ({ children }: any) => children,
  };
});

// Mock RBAC permission context
vi.mock("@/src/core/rbac/context/permission-context", () => ({
  usePermissionContext: vi.fn(() => ({
    can: vi.fn(() => true),
    canAny: vi.fn(() => true),
    canAll: vi.fn(() => true),
    hasRole: vi.fn(() => true),
    hasRoleOrHigher: vi.fn(() => true),
    isLoading: false,
    roles: { primaryRole: "PROGRAM_REVIEWER", roles: ["PROGRAM_REVIEWER"] },
    permissions: ["application:view_assigned", "application:review"],
  })),
  useIsReviewer: vi.fn(() => true),
  useCan: vi.fn(() => true),
}));

// Mock UI components
vi.mock("@/components/Utilities/Button", () => ({
  Button: ({ children, onClick, className, variant, ...props }: any) =>
    React.createElement(
      "button",
      { onClick, className, "data-variant": variant, ...props },
      children
    ),
}));

vi.mock("@/components/Utilities/Spinner", () => ({
  Spinner: () => React.createElement("div", { "data-testid": "spinner" }, "Loading..."),
}));

// Mock ApplicationView components
vi.mock("@/components/FundingPlatform/ApplicationView/HeaderActions", () => {
  const MockHeaderActions = ({ currentStatus, onStatusChange, isUpdating }: any) => {
    const buttons: React.ReactNode[] = [];

    if (currentStatus === "pending" || currentStatus === "resubmitted") {
      buttons.push(
        React.createElement(
          "button",
          {
            key: "start-review",
            onClick: () => onStatusChange("under_review"),
            disabled: isUpdating,
            "data-testid": "start-review-btn",
          },
          "Start Review"
        )
      );
    }

    if (currentStatus === "under_review") {
      buttons.push(
        React.createElement(
          "button",
          {
            key: "approve",
            onClick: () => onStatusChange("approved"),
            disabled: isUpdating,
            "data-testid": "approve-btn",
          },
          "Approve"
        ),
        React.createElement(
          "button",
          {
            key: "revision",
            onClick: () => onStatusChange("revision_requested"),
            disabled: isUpdating,
            "data-testid": "request-revision-btn",
          },
          "Request Revision"
        ),
        React.createElement(
          "button",
          {
            key: "reject",
            onClick: () => onStatusChange("rejected"),
            disabled: isUpdating,
            "data-testid": "reject-btn",
          },
          "Reject"
        )
      );
    }

    if (currentStatus === "revision_requested") {
      buttons.push(
        React.createElement(
          "button",
          {
            key: "review",
            onClick: () => onStatusChange("under_review"),
            disabled: isUpdating,
            "data-testid": "review-btn",
          },
          "Review"
        )
      );
    }

    return React.createElement("div", { "data-testid": "header-actions" }, buttons);
  };

  return {
    __esModule: true,
    default: MockHeaderActions,
  };
});

vi.mock("@/components/FundingPlatform/ApplicationView/StatusChangeInline", () => ({
  StatusChangeInline: ({ status, onConfirm, onCancel, isSubmitting }: any) =>
    React.createElement(
      "div",
      { "data-testid": "status-change-inline" },
      React.createElement("span", { "data-testid": "selected-status" }, status),
      React.createElement("textarea", {
        "data-testid": "status-note",
        placeholder: "Add a note...",
      }),
      React.createElement(
        "button",
        {
          onClick: () => onConfirm("Test reason"),
          disabled: isSubmitting,
          "data-testid": "confirm-btn",
        },
        "Confirm"
      ),
      React.createElement(
        "button",
        {
          onClick: onCancel,
          disabled: isSubmitting,
          "data-testid": "cancel-btn",
        },
        "Cancel"
      )
    ),
}));

vi.mock("@/components/FundingPlatform/ApplicationView/ApplicationHeader", () => ({
  __esModule: true,
  default: ({ application, statusActions }: any) =>
    React.createElement(
      "div",
      { "data-testid": "application-header" },
      React.createElement("span", { "data-testid": "app-status" }, application?.status),
      React.createElement("span", { "data-testid": "app-reference" }, application?.referenceNumber),
      statusActions &&
        React.createElement("div", { "data-testid": "status-actions-container" }, statusActions)
    ),
}));

vi.mock("@/components/FundingPlatform/ApplicationView/ApplicationTab", () => ({
  ApplicationTab: () =>
    React.createElement("div", { "data-testid": "application-tab" }, "Application Tab"),
}));

vi.mock("@/components/FundingPlatform/ApplicationView/AIAnalysisTab", () => ({
  AIAnalysisTab: () =>
    React.createElement("div", { "data-testid": "ai-analysis-tab" }, "AI Analysis Tab"),
}));

vi.mock("@/components/FundingPlatform/ApplicationView/DiscussionTab", () => ({
  DiscussionTab: () =>
    React.createElement("div", { "data-testid": "discussion-tab" }, "Discussion Tab"),
}));

vi.mock("@/components/FundingPlatform/ApplicationView/ApplicationTabs", () => ({
  ApplicationTabs: ({ tabs }: any) =>
    React.createElement(
      "div",
      { "data-testid": "application-tabs" },
      tabs.map((tab: any) =>
        React.createElement("div", { key: tab.id, "data-testid": `tab-${tab.id}` }, tab.content)
      )
    ),
  TabIcons: {
    Application: () => null,
    AIAnalysis: () => null,
    Discussion: () => null,
  },
}));

vi.mock("@/components/FundingPlatform/ApplicationView/TabPanel", () => ({
  TabPanel: ({ children }: any) =>
    React.createElement("div", { "data-testid": "tab-panel" }, children),
}));

// Import the page component after mocks (now uses unified manage route)
import ReviewerApplicationDetailPage from "@/app/community/[communityId]/manage/funding-platform/[programId]/applications/[applicationId]/page";

describe("Reviewer Status Change Functionality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateStatusAsync.mockResolvedValue({});

    // Reset hooks to default values
    const { useApplication } = require("@/hooks/useFundingPlatform");
    useApplication.mockReturnValue({
      application: {
        id: "test-app-1",
        referenceNumber: "APP-001",
        status: "pending",
        projectUID: null,
        statusHistory: [],
      },
      isLoading: false,
      refetch: mockRefetchApplication,
    });

    const { usePermissions } = require("@/hooks/usePermissions");
    usePermissions.mockReturnValue({
      hasPermission: true,
      isLoading: false,
    });

    // Reset RBAC context to default values
    const {
      usePermissionContext,
      useIsReviewer,
      useCan,
    } = require("@/src/core/rbac/context/permission-context");
    usePermissionContext.mockReturnValue({
      can: vi.fn(() => true),
      canAny: vi.fn(() => true),
      canAll: vi.fn(() => true),
      hasRole: vi.fn(() => true),
      hasRoleOrHigher: vi.fn(() => true),
      isLoading: false,
      roles: { primaryRole: "PROGRAM_REVIEWER", roles: ["PROGRAM_REVIEWER"] },
      permissions: ["application:view_assigned", "application:review"],
    });
    useIsReviewer.mockReturnValue(true);
    useCan.mockReturnValue(true);
  });

  describe("Status Actions Rendering", () => {
    it("should render status action buttons for reviewers with permission", () => {
      render(React.createElement(ReviewerApplicationDetailPage));

      expect(screen.getByTestId("header-actions")).toBeInTheDocument();
      expect(screen.getByTestId("status-actions-container")).toBeInTheDocument();
    });

    it("should show Start Review button for pending applications", () => {
      render(React.createElement(ReviewerApplicationDetailPage));

      expect(screen.getByTestId("start-review-btn")).toBeInTheDocument();
    });

    it("should show Approve, Request Revision, and Reject buttons for under_review applications", () => {
      const { useApplication } = require("@/hooks/useFundingPlatform");
      useApplication.mockReturnValue({
        application: {
          id: "test-app-1",
          referenceNumber: "APP-001",
          status: "under_review",
          projectUID: null,
          statusHistory: [],
        },
        isLoading: false,
        refetch: mockRefetchApplication,
      });

      render(React.createElement(ReviewerApplicationDetailPage));

      expect(screen.getByTestId("approve-btn")).toBeInTheDocument();
      expect(screen.getByTestId("request-revision-btn")).toBeInTheDocument();
      expect(screen.getByTestId("reject-btn")).toBeInTheDocument();
    });

    it("should NOT show status actions for approved applications", () => {
      const { useApplication } = require("@/hooks/useFundingPlatform");
      useApplication.mockReturnValue({
        application: {
          id: "test-app-1",
          referenceNumber: "APP-001",
          status: "approved",
          projectUID: "project-123",
          statusHistory: [],
        },
        isLoading: false,
        refetch: mockRefetchApplication,
      });

      render(React.createElement(ReviewerApplicationDetailPage));

      expect(screen.queryByTestId("status-actions-container")).not.toBeInTheDocument();
    });

    it("should NOT show status actions for rejected applications", () => {
      const { useApplication } = require("@/hooks/useFundingPlatform");
      useApplication.mockReturnValue({
        application: {
          id: "test-app-1",
          referenceNumber: "APP-001",
          status: "rejected",
          projectUID: null,
          statusHistory: [],
        },
        isLoading: false,
        refetch: mockRefetchApplication,
      });

      render(React.createElement(ReviewerApplicationDetailPage));

      expect(screen.queryByTestId("status-actions-container")).not.toBeInTheDocument();
    });
  });

  describe("Status Change Flow", () => {
    it("should show StatusChangeInline form when status button is clicked", async () => {
      const user = userEvent.setup();
      render(React.createElement(ReviewerApplicationDetailPage));

      // Click Start Review button
      await user.click(screen.getByTestId("start-review-btn"));

      // StatusChangeInline should appear
      expect(screen.getByTestId("status-change-inline")).toBeInTheDocument();
      expect(screen.getByTestId("selected-status")).toHaveTextContent("under_review");
    });

    it("should hide StatusChangeInline form when cancel is clicked", async () => {
      const user = userEvent.setup();
      render(React.createElement(ReviewerApplicationDetailPage));

      // Click Start Review to show inline form
      await user.click(screen.getByTestId("start-review-btn"));
      expect(screen.getByTestId("status-change-inline")).toBeInTheDocument();

      // Click cancel
      await user.click(screen.getByTestId("cancel-btn"));

      // StatusChangeInline should be hidden
      expect(screen.queryByTestId("status-change-inline")).not.toBeInTheDocument();
    });

    it("should toggle StatusChangeInline when same status button is clicked twice", async () => {
      const user = userEvent.setup();
      render(React.createElement(ReviewerApplicationDetailPage));

      // Click Start Review to show inline form
      await user.click(screen.getByTestId("start-review-btn"));
      expect(screen.getByTestId("status-change-inline")).toBeInTheDocument();

      // Click Start Review again to hide
      await user.click(screen.getByTestId("start-review-btn"));
      expect(screen.queryByTestId("status-change-inline")).not.toBeInTheDocument();
    });

    it("should call updateStatusAsync when status change is confirmed", async () => {
      const user = userEvent.setup();
      render(React.createElement(ReviewerApplicationDetailPage));

      // Click Start Review to show inline form
      await user.click(screen.getByTestId("start-review-btn"));

      // Click confirm
      await user.click(screen.getByTestId("confirm-btn"));

      await waitFor(() => {
        expect(mockUpdateStatusAsync).toHaveBeenCalledWith({
          applicationId: "APP-001",
          status: "under_review",
          note: "Test reason",
          approvedAmount: undefined,
          approvedCurrency: undefined,
        });
      });
    });

    it("should show success toast after successful status change", async () => {
      const toast = require("react-hot-toast").default;
      const user = userEvent.setup();
      render(React.createElement(ReviewerApplicationDetailPage));

      // Click Start Review to show inline form
      await user.click(screen.getByTestId("start-review-btn"));

      // Click confirm
      await user.click(screen.getByTestId("confirm-btn"));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("status updated"));
      });
    });

    it("should show error toast when status change fails", async () => {
      const toast = require("react-hot-toast").default;
      mockUpdateStatusAsync.mockRejectedValue(new Error("API Error"));

      const user = userEvent.setup();
      render(React.createElement(ReviewerApplicationDetailPage));

      // Click Start Review to show inline form
      await user.click(screen.getByTestId("start-review-btn"));

      // Click confirm
      await user.click(screen.getByTestId("confirm-btn"));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("API Error");
      });
    });
  });

  describe("Permission Checks", () => {
    it("should hide status actions when reviewer has no permission", () => {
      // Mock RBAC context with no permissions
      const { usePermissionContext } = require("@/src/core/rbac/context/permission-context");
      usePermissionContext.mockReturnValue({
        can: vi.fn(() => false),
        canAny: vi.fn(() => false),
        canAll: vi.fn(() => false),
        hasRole: vi.fn(() => false),
        hasRoleOrHigher: vi.fn(() => false),
        isLoading: false,
        roles: { primaryRole: "GUEST", roles: ["GUEST"] },
        permissions: [],
      });

      render(React.createElement(ReviewerApplicationDetailPage));

      expect(screen.getByTestId("application-header")).toBeInTheDocument();
      expect(screen.queryByTestId("status-actions-container")).not.toBeInTheDocument();
    });

    it("should show loading spinner when permissions are loading", () => {
      // Mock RBAC context with loading state
      const { usePermissionContext } = require("@/src/core/rbac/context/permission-context");
      usePermissionContext.mockReturnValue({
        can: vi.fn(() => false),
        canAny: vi.fn(() => false),
        canAll: vi.fn(() => false),
        hasRole: vi.fn(() => false),
        hasRoleOrHigher: vi.fn(() => false),
        isLoading: true,
        roles: { primaryRole: null, roles: [] },
        permissions: [],
      });

      render(React.createElement(ReviewerApplicationDetailPage));

      expect(screen.getByTestId("spinner")).toBeInTheDocument();
    });

    it("should show loading spinner when application is loading", () => {
      const { useApplication } = require("@/hooks/useFundingPlatform");
      useApplication.mockReturnValue({
        application: null,
        isLoading: true,
        refetch: mockRefetchApplication,
      });

      render(React.createElement(ReviewerApplicationDetailPage));

      expect(screen.getByTestId("spinner")).toBeInTheDocument();
    });
  });

  describe("Reviewer Badge", () => {
    it("should display reviewer mode badge", () => {
      const {
        usePermissionContext,
        useCan,
      } = require("@/src/core/rbac/context/permission-context");
      usePermissionContext.mockReturnValue({
        can: vi.fn(() => false),
        canAny: vi.fn(() => false),
        canAll: vi.fn(() => false),
        hasRole: vi.fn(() => true),
        hasRoleOrHigher: vi.fn(() => true),
        isLoading: false,
        roles: { primaryRole: "PROGRAM_REVIEWER", roles: ["PROGRAM_REVIEWER"] },
        permissions: ["application:view_assigned", "application:review"],
      });
      useCan.mockReturnValue(false);

      render(React.createElement(ReviewerApplicationDetailPage));

      expect(screen.getByText(/reviewer mode/i)).toBeInTheDocument();
    });
  });

  describe("Application Header Integration", () => {
    it("should pass application data to ApplicationHeader", () => {
      render(React.createElement(ReviewerApplicationDetailPage));

      expect(screen.getByTestId("app-status")).toHaveTextContent("pending");
      expect(screen.getByTestId("app-reference")).toHaveTextContent("APP-001");
    });
  });

  describe("Status Change for Different Application States", () => {
    it("should allow approving an under_review application", async () => {
      const { useApplication } = require("@/hooks/useFundingPlatform");
      useApplication.mockReturnValue({
        application: {
          id: "test-app-1",
          referenceNumber: "APP-001",
          status: "under_review",
          projectUID: null,
          statusHistory: [],
        },
        isLoading: false,
        refetch: mockRefetchApplication,
      });

      const user = userEvent.setup();
      render(React.createElement(ReviewerApplicationDetailPage));

      // Click Approve button
      await user.click(screen.getByTestId("approve-btn"));

      // StatusChangeInline should show with 'approved' status
      expect(screen.getByTestId("status-change-inline")).toBeInTheDocument();
      expect(screen.getByTestId("selected-status")).toHaveTextContent("approved");
    });

    it("should allow requesting revision for an under_review application", async () => {
      const { useApplication } = require("@/hooks/useFundingPlatform");
      useApplication.mockReturnValue({
        application: {
          id: "test-app-1",
          referenceNumber: "APP-001",
          status: "under_review",
          projectUID: null,
          statusHistory: [],
        },
        isLoading: false,
        refetch: mockRefetchApplication,
      });

      const user = userEvent.setup();
      render(React.createElement(ReviewerApplicationDetailPage));

      // Click Request Revision button
      await user.click(screen.getByTestId("request-revision-btn"));

      // StatusChangeInline should show with 'revision_requested' status
      expect(screen.getByTestId("status-change-inline")).toBeInTheDocument();
      expect(screen.getByTestId("selected-status")).toHaveTextContent("revision_requested");
    });

    it("should allow rejecting an under_review application", async () => {
      const { useApplication } = require("@/hooks/useFundingPlatform");
      useApplication.mockReturnValue({
        application: {
          id: "test-app-1",
          referenceNumber: "APP-001",
          status: "under_review",
          projectUID: null,
          statusHistory: [],
        },
        isLoading: false,
        refetch: mockRefetchApplication,
      });

      const user = userEvent.setup();
      render(React.createElement(ReviewerApplicationDetailPage));

      // Click Reject button
      await user.click(screen.getByTestId("reject-btn"));

      // StatusChangeInline should show with 'rejected' status
      expect(screen.getByTestId("status-change-inline")).toBeInTheDocument();
      expect(screen.getByTestId("selected-status")).toHaveTextContent("rejected");
    });
  });

  describe("Application Not Found", () => {
    it("should show 'Application not found' when application is null", () => {
      const { useApplication } = require("@/hooks/useFundingPlatform");
      useApplication.mockReturnValue({
        application: null,
        isLoading: false,
        refetch: mockRefetchApplication,
      });

      render(React.createElement(ReviewerApplicationDetailPage));

      expect(screen.getByText(/application not found/i)).toBeInTheDocument();
    });
  });

  describe("Milestone Review Link", () => {
    it("should show milestone review link for approved applications with projectUID", () => {
      const { useApplication } = require("@/hooks/useFundingPlatform");
      useApplication.mockReturnValue({
        application: {
          id: "test-app-1",
          referenceNumber: "APP-001",
          status: "approved",
          projectUID: "project-123",
          statusHistory: [],
        },
        isLoading: false,
        refetch: mockRefetchApplication,
      });

      render(React.createElement(ReviewerApplicationDetailPage));

      expect(screen.getByText(/review project milestones/i)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /view milestones/i })).toBeInTheDocument();
    });

    it("should NOT show milestone review link for non-approved applications", () => {
      render(React.createElement(ReviewerApplicationDetailPage));

      expect(screen.queryByText(/review project milestones/i)).not.toBeInTheDocument();
    });
  });
});
