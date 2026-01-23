import { describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ProjectPageIndex from "@/app/project/[projectId]/page";

// Mocks for next/dynamic, ProjectPage, and ProjectOverviewLoading are pre-registered in tests/bun-setup.ts

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
