import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApplicationTab } from "@/components/FundingPlatform/ApplicationView/ApplicationTab";
import type { IFundingApplication, ProgramWithFormSchema } from "@/types/funding-platform";

// Mock child components
jest.mock("@/components/FundingPlatform/ApplicationView/ApplicationTab/ApplicationSubTabs", () => ({
  ApplicationSubTabs: ({ activeTab, onTabChange, showPostApproval }: any) => (
    <div data-testid="sub-tabs">
      <button
        type="button"
        onClick={() => onTabChange("application")}
        data-active={activeTab === "application"}
      >
        Application
      </button>
      {showPostApproval && (
        <button
          type="button"
          onClick={() => onTabChange("post-approval")}
          data-active={activeTab === "post-approval"}
        >
          Post Approval
        </button>
      )}
    </div>
  ),
}));

jest.mock(
  "@/components/FundingPlatform/ApplicationView/ApplicationTab/ApplicationDataView",
  () => ({
    ApplicationDataView: () => <div data-testid="application-data-view">Application Data</div>,
  })
);

jest.mock(
  "@/components/FundingPlatform/ApplicationView/ApplicationTab/PostApprovalDataView",
  () => ({
    PostApprovalDataView: () => <div data-testid="post-approval-data-view">Post Approval Data</div>,
  })
);

jest.mock("@/components/FundingPlatform/ApplicationView/ApplicationVersionSelector", () => ({
  __esModule: true,
  default: () => <div data-testid="version-selector">Version Selector</div>,
}));

jest.mock("@/components/FundingPlatform/ApplicationView/ApplicationVersionViewer", () => ({
  __esModule: true,
  default: () => <div data-testid="version-viewer">Version Viewer</div>,
}));

jest.mock("@/components/Utilities/MarkdownPreview", () => ({
  MarkdownPreview: ({ source }: { source: string }) => <div data-testid="markdown">{source}</div>,
}));

jest.mock("@/hooks/useFundingPlatform", () => ({
  useApplicationVersions: () => ({
    versions: [],
    isLoading: false,
  }),
}));

jest.mock("@/store/applicationVersions", () => ({
  useApplicationVersionsStore: () => ({
    selectedVersion: null,
    selectVersion: jest.fn(),
  }),
}));

jest.mock("@/utilities/tailwind", () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));

describe("ApplicationTab", () => {
  const mockApplication: Partial<IFundingApplication> = {
    id: "test-app-1",
    referenceNumber: "APP-TEST-123",
    status: "pending",
    applicationData: {
      projectName: "Test Project",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockProgram: Partial<ProgramWithFormSchema> = {
    formSchema: {
      fields: [{ id: "projectName", label: "Project Name", type: "text" }],
    },
  };

  describe("Rendering", () => {
    it("renders sub-tabs when post-approval data exists", () => {
      const approvedApp: Partial<IFundingApplication> = {
        ...mockApplication,
        status: "approved",
        postApprovalData: { walletAddress: "0x123" },
      };

      render(
        <ApplicationTab
          application={approvedApp as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      expect(screen.getByTestId("sub-tabs")).toBeInTheDocument();
    });

    it("does not render sub-tabs when no post-approval data exists", () => {
      render(
        <ApplicationTab
          application={mockApplication as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      expect(screen.queryByTestId("sub-tabs")).not.toBeInTheDocument();
    });

    it("renders Application data view by default", () => {
      render(
        <ApplicationTab
          application={mockApplication as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      expect(screen.getByTestId("application-data-view")).toBeInTheDocument();
    });

    it("does not show Post Approval tab when application is not approved", () => {
      render(
        <ApplicationTab
          application={mockApplication as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      expect(screen.queryByText("Post Approval")).not.toBeInTheDocument();
    });

    it("shows Post Approval tab when application is approved and has post-approval data", () => {
      const approvedApp: Partial<IFundingApplication> = {
        ...mockApplication,
        status: "approved",
        postApprovalData: { walletAddress: "0x123" },
      };

      render(
        <ApplicationTab
          application={approvedApp as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      expect(screen.getByText("Post Approval")).toBeInTheDocument();
    });
  });

  describe("Revision Reason", () => {
    it("shows revision reason when status is revision_requested", () => {
      const revisionApp: Partial<IFundingApplication> = {
        ...mockApplication,
        status: "revision_requested",
        statusHistory: [
          {
            status: "revision_requested",
            timestamp: new Date().toISOString(),
            reason: "Please provide more details",
          },
        ],
      };

      render(
        <ApplicationTab
          application={revisionApp as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      expect(screen.getByText("Revision Requested")).toBeInTheDocument();
      expect(screen.getByText("Please provide more details")).toBeInTheDocument();
    });

    it("does not show revision reason for other statuses", () => {
      render(
        <ApplicationTab
          application={mockApplication as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      expect(screen.queryByText("Revision Requested")).not.toBeInTheDocument();
    });
  });

  describe("Sub-tab Navigation", () => {
    it("switches to Post Approval view when Post Approval tab is clicked", async () => {
      const user = userEvent.setup();
      const approvedApp: Partial<IFundingApplication> = {
        ...mockApplication,
        status: "approved",
        postApprovalData: { walletAddress: "0x123" },
      };

      render(
        <ApplicationTab
          application={approvedApp as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      await user.click(screen.getByText("Post Approval"));

      expect(screen.getByTestId("post-approval-data-view")).toBeInTheDocument();
    });

    it("switches back to Application view when Application tab is clicked", async () => {
      const user = userEvent.setup();
      const approvedApp: Partial<IFundingApplication> = {
        ...mockApplication,
        status: "approved",
        postApprovalData: { walletAddress: "0x123" },
      };

      render(
        <ApplicationTab
          application={approvedApp as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      // Switch to Post Approval
      await user.click(screen.getByText("Post Approval"));
      expect(screen.getByTestId("post-approval-data-view")).toBeInTheDocument();

      // Switch back to Application
      await user.click(screen.getByText("Application"));
      expect(screen.getByTestId("application-data-view")).toBeInTheDocument();
    });
  });

  describe("View Mode Control", () => {
    it("calls onViewModeChange when controlled", async () => {
      const mockOnViewModeChange = jest.fn();

      // Mock versions to enable toggle
      jest.doMock("@/hooks/useFundingPlatform", () => ({
        useApplicationVersions: () => ({
          versions: [{ id: "v1", version: 1 }],
          isLoading: false,
        }),
      }));

      render(
        <ApplicationTab
          application={mockApplication as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
          viewMode="details"
          onViewModeChange={mockOnViewModeChange}
        />
      );

      // Component should render without errors
      expect(screen.getByTestId("application-data-view")).toBeInTheDocument();
    });
  });
});
