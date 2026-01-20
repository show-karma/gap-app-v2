import { render, screen } from "@testing-library/react";
import Projects from "@/app/projects/page";
import "@testing-library/jest-dom";

jest.mock("@/components/Pages/Projects", () => ({
  ProjectsExplorer: () => <div data-testid="projects-explorer">Projects Explorer</div>,
  ProjectsHeroSection: () => <div data-testid="projects-hero">Projects Hero Section</div>,
  ProjectsLoading: () => <div data-testid="projects-loading">Loading...</div>,
}));

describe("Projects Page", () => {
  it("renders the ProjectsExplorer component", () => {
    render(<Projects />);
    expect(screen.getByTestId("projects-explorer")).toBeInTheDocument();
    expect(screen.getByText("Projects Explorer")).toBeInTheDocument();
  });

  it("renders the ProjectsHeroSection component", () => {
    render(<Projects />);
    expect(screen.getByTestId("projects-hero")).toBeInTheDocument();
    expect(screen.getByText("Projects Hero Section")).toBeInTheDocument();
  });
});
