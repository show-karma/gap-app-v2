/**
 * Tests for ApplicationHeader component.
 *
 * Focuses on behavioral concerns:
 * - Status-driven rendering: different statuses produce different labels, icons, colors
 * - Conditional rendering of actions section, email, KYC badge
 * - Edge cases: missing project name, unknown status
 * - connectedToTabs prop changes border-radius behavior
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import ApplicationHeader from "@/components/FundingPlatform/ApplicationView/ApplicationHeader";
import type { IFundingApplication } from "@/types/funding-platform";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(ui, { wrapper: createWrapper() });
};

vi.mock("@/utilities/formatDate", () => ({
  formatDate: (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  },
}));

vi.mock("@/components/FundingPlatform/helper/getProjectTitle", () => ({
  getProjectTitle: (application: any) =>
    application.applicationData?.projectName || "Untitled Project",
}));

vi.mock("@heroicons/react/24/outline", () => ({
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
  describe("status-driven rendering", () => {
    const statusCases = [
      {
        status: "pending",
        label: "Pending",
        iconTestId: "clock-icon",
        colorClass: "bg-blue-100",
      },
      {
        status: "under_review",
        label: "Under Review",
        iconTestId: "clock-icon",
        colorClass: "bg-purple-100",
      },
      {
        status: "revision_requested",
        label: "Revision Requested",
        iconTestId: "warning-icon",
        colorClass: "bg-yellow-100",
      },
      {
        status: "approved",
        label: "Approved",
        iconTestId: "check-icon",
        colorClass: "bg-green-100",
      },
      {
        status: "rejected",
        label: "Rejected",
        iconTestId: "x-icon",
        colorClass: "bg-red-100",
      },
      {
        status: "resubmitted",
        label: "Resubmitted",
        iconTestId: "clock-icon",
        colorClass: "bg-blue-100",
      },
    ];

    it.each(statusCases)(
      "renders '$label' with $iconTestId icon and $colorClass for status=$status",
      ({ status, label, iconTestId, colorClass }) => {
        const application = createMockApplication({ status });
        const { container } = renderWithProviders(<ApplicationHeader application={application} />);

        // Correct label text
        expect(screen.getByText(label)).toBeInTheDocument();

        // Correct icon rendered
        expect(screen.getByTestId(iconTestId)).toBeInTheDocument();

        // Correct color class applied to badge
        const statusBadge = container.querySelector(`[class*="${colorClass}"]`);
        expect(statusBadge).toBeInTheDocument();
      }
    );
  });

  describe("metadata display", () => {
    it("shows project title, reference number, email, and dates", () => {
      const application = createMockApplication();
      renderWithProviders(<ApplicationHeader application={application} />);

      expect(screen.getByText("Test Project")).toBeInTheDocument();
      expect(screen.getByText("APP-TEST-12345")).toBeInTheDocument();
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
      expect(screen.getByText(/Submitted:/)).toBeInTheDocument();
      expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    });

    it("hides email section when applicantEmail is absent", () => {
      const application = createMockApplication({ applicantEmail: undefined });
      renderWithProviders(<ApplicationHeader application={application} />);

      expect(screen.queryByText("Submitted by:")).not.toBeInTheDocument();
    });
  });

  describe("actions section conditional rendering", () => {
    it("renders statusActions and shows the actions row with border-t", () => {
      const application = createMockApplication();
      const { container } = renderWithProviders(
        <ApplicationHeader application={application} statusActions={<button>Approve</button>} />
      );

      expect(screen.getByRole("button", { name: /approve/i })).toBeInTheDocument();
      expect(container.querySelector(".border-t")).toBeInTheDocument();
    });

    it("renders moreActions next to the status badge", () => {
      const application = createMockApplication();
      renderWithProviders(
        <ApplicationHeader application={application} moreActions={<button>More Options</button>} />
      );

      expect(screen.getByRole("button", { name: /more options/i })).toBeInTheDocument();
    });

    it("hides the actions row when only moreActions (no statusActions) is provided", () => {
      const application = createMockApplication();
      const { container } = renderWithProviders(
        <ApplicationHeader application={application} moreActions={<button>More</button>} />
      );

      // The border-t section only appears when statusActions is provided
      const actionSection = container.querySelector(".border-t.border-gray-200");
      expect(actionSection).not.toBeInTheDocument();
    });

    it("hides the actions row when neither statusActions nor moreActions are provided", () => {
      const application = createMockApplication();
      const { container } = renderWithProviders(<ApplicationHeader application={application} />);

      const actionSection = container.querySelector(".border-t.border-gray-200");
      expect(actionSection).not.toBeInTheDocument();
    });
  });

  describe("connectedToTabs prop", () => {
    it("applies rounded-t-lg and no bottom border when connectedToTabs is true", () => {
      const application = createMockApplication();
      const { container } = renderWithProviders(
        <ApplicationHeader application={application} connectedToTabs={true} />
      );

      const root = container.firstChild as HTMLElement;
      expect(root).toHaveClass("rounded-t-lg");
      expect(root).toHaveClass("border-b-0");
    });

    it("applies full rounded-lg border when connectedToTabs is false (default)", () => {
      const application = createMockApplication();
      const { container } = renderWithProviders(<ApplicationHeader application={application} />);

      const root = container.firstChild as HTMLElement;
      expect(root).toHaveClass("rounded-lg");
      expect(root).not.toHaveClass("border-b-0");
    });
  });

  describe("edge cases", () => {
    it("shows 'Untitled Project' when project name is missing", () => {
      const application = createMockApplication({ applicationData: {} });
      renderWithProviders(<ApplicationHeader application={application} />);

      expect(screen.getByText("Untitled Project")).toBeInTheDocument();
    });

    it("shows formatted unknown status text and falls back to clock icon", () => {
      const application = createMockApplication({
        status: "unknown_status" as any,
      });
      renderWithProviders(<ApplicationHeader application={application} />);

      expect(screen.getByText("Unknown Status")).toBeInTheDocument();
      // Falls back to ClockIcon
      expect(screen.getByTestId("clock-icon")).toBeInTheDocument();
    });

    it("provides an accessible aria-label on the status badge", () => {
      const application = createMockApplication({ status: "approved" });
      renderWithProviders(<ApplicationHeader application={application} />);

      const badge = screen.getByLabelText("Application status: Approved");
      expect(badge).toBeInTheDocument();
    });
  });
});
