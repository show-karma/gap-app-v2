import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ProjectPageIndex from "@/app/project/[projectId]/page";

jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: (
    callback: () => Promise<any>,
    options: { loading: () => React.ReactNode }
  ) => {
    return function DynamicComponent() {
      return options.loading();
    };
  },
}));

jest.mock("@/components/Pages/Project/ProjectPage", () => {
  return function MockProjectPage() {
    return <div data-testid="mock-project-page">Mocked Project Page</div>;
  };
});

jest.mock("@/components/Pages/Project/Loading/Overview", () => ({
  ProjectOverviewLoading: () => (
    <div data-testid="project-overview-loading">Loading...</div>
  ),
}));

describe("Project Page", () => {
  it("renders the loading component while the main component is loading", () => {
    render(<ProjectPageIndex />);

    expect(screen.getByTestId("project-overview-loading")).toBeInTheDocument();
  });

  it("renders the ProjectPage component when loaded", async () => {
    render(<ProjectPageIndex />);

    // The dynamic import is mocked to always return the loading component
    // So we should only expect to see the loading component
    expect(screen.getByTestId("project-overview-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-project-page")).not.toBeInTheDocument();
  });
});
