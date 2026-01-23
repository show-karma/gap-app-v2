import { describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";
import ApplicationHeader from "@/components/FundingPlatform/ApplicationView/ApplicationHeader";
import type { IFundingApplication } from "@/types/funding-platform";

// Mock the formatDate utility
jest.mock("@/utilities/formatDate", () => ({
  formatDate: (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  },
}));

// Mock the getProjectTitle helper
jest.mock("@/components/FundingPlatform/helper/getProjecTitle", () => ({
  getProjectTitle: (application: any) =>
    application.applicationData?.projectName || "Untitled Project",
}));

// Mock Heroicons
jest.mock("@heroicons/react/24/outline", () => ({
  CheckCircleIcon: (props: any) => <svg data-testid="check-icon" {...props} />,
  ClockIcon: (props: any) => <svg data-testid="clock-icon" {...props} />,
  ExclamationTriangleIcon: (props: any) => <svg data-testid="warning-icon" {...props} />,
  XMarkIcon: (props: any) => <svg data-testid="x-icon" {...props} />,
  EllipsisHorizontalIcon: (props: any) => <svg data-testid="ellipsis-icon" {...props} />,
}));

const createMockApplication = (
  overrides: Partial<IFundingApplication> = {}
): IFundingApplication => ({
  id: "test-id-123",
  programId: "program-123",
  chainID: 42161,
  applicantEmail: "test@example.com",
  applicationData: {
    projectName: "Test Project",
    description: "A test project description",
  },
  status: "pending",
  statusHistory: [],
  referenceNumber: "APP-TEST-12345",
  submissionIP: "127.0.0.1",
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-01-16T14:30:00Z",
  ...overrides,
});

describe("ApplicationHeader", () => {
  describe("Rendering", () => {
    it("should render project title", () => {
      const application = createMockApplication();
      render(<ApplicationHeader application={application} />);

      expect(screen.getByText("Test Project")).toBeInTheDocument();
    });

    it("should render reference number", () => {
      const application = createMockApplication();
      render(<ApplicationHeader application={application} />);

      expect(screen.getByText("APP-TEST-12345")).toBeInTheDocument();
    });

    it("should render applicant email", () => {
      const application = createMockApplication();
      render(<ApplicationHeader application={application} />);

      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });

    it("should render submitted date", () => {
      const application = createMockApplication();
      render(<ApplicationHeader application={application} />);

      expect(screen.getByText(/Submitted:/)).toBeInTheDocument();
    });

    it("should render last updated date", () => {
      const application = createMockApplication();
      render(<ApplicationHeader application={application} />);

      expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    });
  });

  describe("Status Badge", () => {
    it("should display pending status", () => {
      const application = createMockApplication({ status: "pending" });
      render(<ApplicationHeader application={application} />);

      expect(screen.getByText("Pending")).toBeInTheDocument();
      expect(screen.getByTestId("clock-icon")).toBeInTheDocument();
    });

    it("should display under_review status formatted correctly", () => {
      const application = createMockApplication({ status: "under_review" });
      render(<ApplicationHeader application={application} />);

      expect(screen.getByText("Under Review")).toBeInTheDocument();
    });

    it("should display revision_requested status formatted correctly", () => {
      const application = createMockApplication({ status: "revision_requested" });
      render(<ApplicationHeader application={application} />);

      expect(screen.getByText("Revision Requested")).toBeInTheDocument();
      expect(screen.getByTestId("warning-icon")).toBeInTheDocument();
    });

    it("should display approved status", () => {
      const application = createMockApplication({ status: "approved" });
      render(<ApplicationHeader application={application} />);

      expect(screen.getByText("Approved")).toBeInTheDocument();
      expect(screen.getByTestId("check-icon")).toBeInTheDocument();
    });

    it("should display rejected status", () => {
      const application = createMockApplication({ status: "rejected" });
      render(<ApplicationHeader application={application} />);

      expect(screen.getByText("Rejected")).toBeInTheDocument();
      expect(screen.getByTestId("x-icon")).toBeInTheDocument();
    });

    it("should display resubmitted status", () => {
      const application = createMockApplication({ status: "resubmitted" });
      render(<ApplicationHeader application={application} />);

      expect(screen.getByText("Resubmitted")).toBeInTheDocument();
    });
  });

  describe("Status Colors", () => {
    it("should apply blue color for pending status", () => {
      const application = createMockApplication({ status: "pending" });
      const { container } = render(<ApplicationHeader application={application} />);

      const statusBadge = container.querySelector('[class*="bg-blue-100"]');
      expect(statusBadge).toBeInTheDocument();
    });

    it("should apply purple color for under_review status", () => {
      const application = createMockApplication({ status: "under_review" });
      const { container } = render(<ApplicationHeader application={application} />);

      const statusBadge = container.querySelector('[class*="bg-purple-100"]');
      expect(statusBadge).toBeInTheDocument();
    });

    it("should apply yellow color for revision_requested status", () => {
      const application = createMockApplication({ status: "revision_requested" });
      const { container } = render(<ApplicationHeader application={application} />);

      const statusBadge = container.querySelector('[class*="bg-yellow-100"]');
      expect(statusBadge).toBeInTheDocument();
    });

    it("should apply green color for approved status", () => {
      const application = createMockApplication({ status: "approved" });
      const { container } = render(<ApplicationHeader application={application} />);

      const statusBadge = container.querySelector('[class*="bg-green-100"]');
      expect(statusBadge).toBeInTheDocument();
    });

    it("should apply red color for rejected status", () => {
      const application = createMockApplication({ status: "rejected" });
      const { container } = render(<ApplicationHeader application={application} />);

      const statusBadge = container.querySelector('[class*="bg-red-100"]');
      expect(statusBadge).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing project name gracefully", () => {
      const application = createMockApplication({
        applicationData: {},
      });
      render(<ApplicationHeader application={application} />);

      expect(screen.getByText("Untitled Project")).toBeInTheDocument();
    });

    it("should handle unknown status gracefully", () => {
      const application = createMockApplication({
        status: "unknown_status" as any,
      });
      render(<ApplicationHeader application={application} />);

      expect(screen.getByText("Unknown Status")).toBeInTheDocument();
    });
  });

  describe("Dark Mode Support", () => {
    it("should have dark mode classes", () => {
      const application = createMockApplication();
      const { container } = render(<ApplicationHeader application={application} />);

      const htmlContent = container.innerHTML;
      expect(htmlContent).toContain("dark:bg-zinc-800");
      expect(htmlContent).toContain("dark:text-white");
    });
  });

  describe("Actions", () => {
    it("should render status actions when provided", () => {
      const application = createMockApplication();
      render(
        <ApplicationHeader application={application} statusActions={<button>Test Action</button>} />
      );

      expect(screen.getByRole("button", { name: /test action/i })).toBeInTheDocument();
    });

    it("should render more actions when provided", () => {
      const application = createMockApplication();
      render(<ApplicationHeader application={application} moreActions={<button>More</button>} />);

      expect(screen.getByRole("button", { name: /more/i })).toBeInTheDocument();
    });

    it("should show actions section with divider when status actions are provided", () => {
      const application = createMockApplication();
      const { container } = render(
        <ApplicationHeader application={application} statusActions={<button>Approve</button>} />
      );

      expect(container.querySelector(".border-t")).toBeInTheDocument();
    });

    it("should not show actions section when no status actions", () => {
      const application = createMockApplication();
      const { container } = render(
        <ApplicationHeader application={application} moreActions={<button>More</button>} />
      );

      // The border-t is only added when statusActions is present
      const actionSection = container.querySelector(".border-t.border-gray-200");
      expect(actionSection).not.toBeInTheDocument();
    });
  });
});
