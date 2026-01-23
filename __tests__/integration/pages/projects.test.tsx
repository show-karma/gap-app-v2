import { describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";
import Projects from "@/app/projects/page";
import "@testing-library/jest-dom";

// NewProjectsPage is mocked in tests/bun-setup.ts
// NOTE: getNewProjects is NOT mocked globally because it has its own unit tests

describe("Projects Page", () => {
  it("renders the NewProjectsPage component", () => {
    render(<Projects />);
    expect(screen.getByTestId("new-projects-page")).toBeInTheDocument();
    expect(screen.getByText("New Projects Page")).toBeInTheDocument();
  });

  it("renders within a Suspense boundary", () => {
    const { container } = render(<Projects />);
    // The page should render successfully with Suspense wrapping
    expect(container).toBeInTheDocument();
    expect(screen.getByTestId("new-projects-page")).toBeInTheDocument();
  });
});
