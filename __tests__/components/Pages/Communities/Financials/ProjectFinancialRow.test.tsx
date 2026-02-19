import { render, screen } from "@testing-library/react";
import { ProjectFinancialRow } from "@/components/Pages/Communities/Financials/ProjectFinancialRow";
import type { ProjectFinancialStatus } from "@/types/financials";

// Mock ProfilePicture
jest.mock("@/components/Utilities/ProfilePicture", () => ({
  ProfilePicture: ({ name, alt }: { name: string; alt: string }) => (
    <div data-testid="profile-picture" data-name={name} data-alt={alt}>
      Avatar
    </div>
  ),
}));

// Mock next/link - preserve data-testid and other props
jest.mock("next/link", () => {
  return ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: any;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
});

describe("ProjectFinancialRow", () => {
  const mockProject: ProjectFinancialStatus = {
    projectUID: "project-1",
    projectName: "Test Project",
    projectSlug: "test-project",
    logoUrl: "https://example.com/logo.png",
    grantUID: "grant-1",
    currency: "USD",
    tokenAddress: null,
    chainID: 1,
    approved: "20000",
    disbursed: "10000",
    remaining: "10000",
    disbursementPercentage: 50,
    disbursementStatus: "PARTIAL",
    milestoneCompletion: 75,
  };

  it("should render project name", () => {
    render(<ProjectFinancialRow project={mockProject} />);

    expect(screen.getByText("Test Project")).toBeInTheDocument();
  });

  it("should display formatted currency amounts", () => {
    render(<ProjectFinancialRow project={mockProject} />);

    expect(screen.getByText("20K USD")).toBeInTheDocument();
  });

  it("should display disbursement percentage", () => {
    render(<ProjectFinancialRow project={mockProject} />);

    expect(screen.getByText("50% disbursed")).toBeInTheDocument();
  });

  it("should display milestone completion percentage", () => {
    render(<ProjectFinancialRow project={mockProject} />);

    expect(screen.getByText("Milestones: 75%")).toBeInTheDocument();
  });

  it("should render profile picture with correct props", () => {
    render(<ProjectFinancialRow project={mockProject} />);

    const profilePicture = screen.getByTestId("profile-picture");
    expect(profilePicture).toHaveAttribute("data-name", "Test Project");
  });

  it("should link to the grant page", () => {
    render(<ProjectFinancialRow project={mockProject} />);

    const link = screen.getByTestId("project-financial-row");
    expect(link).toHaveAttribute("href", "/project/test-project/funding/grant-1");
  });

  it("should use projectUID when projectSlug is empty", () => {
    const projectWithoutSlug: ProjectFinancialStatus = {
      ...mockProject,
      projectSlug: "",
    };

    render(<ProjectFinancialRow project={projectWithoutSlug} />);

    const link = screen.getByTestId("project-financial-row");
    expect(link).toHaveAttribute("href", "/project/project-1/funding/grant-1");
  });

  it("should have correct test id", () => {
    render(<ProjectFinancialRow project={mockProject} />);

    expect(screen.getByTestId("project-financial-row")).toBeInTheDocument();
  });

  it("should render progress bar with correct width", () => {
    const { container } = render(<ProjectFinancialRow project={mockProject} />);

    const progressBar = container.querySelector('[style*="width: 50%"]');
    expect(progressBar).toBeInTheDocument();
  });

  it("should cap progress bar at 100%", () => {
    const overDisbursedProject: ProjectFinancialStatus = {
      ...mockProject,
      disbursementPercentage: 150,
    };

    const { container } = render(<ProjectFinancialRow project={overDisbursedProject} />);

    const progressBar = container.querySelector('[style*="width: 100%"]');
    expect(progressBar).toBeInTheDocument();
  });
});
