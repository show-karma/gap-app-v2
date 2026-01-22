import { describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";
import Projects from "@/app/projects/page";
import "@testing-library/jest-dom";

// Mocks for NewProjectsPage and getNewProjects are pre-registered in tests/bun-setup.ts

describe("Projects Page", () => {
  it("renders the NewProjectsPage component", () => {
    render(<Projects />);
    expect(screen.getByTestId("new-projects-page")).toBeInTheDocument();
    expect(screen.getByText("New Projects Page")).toBeInTheDocument();
  });

  it("mocks data fetching correctly", async () => {
    const mockGetNewProjects = (globalThis as any).__mocks__.getNewProjects;
    const { projects, pageInfo } = await mockGetNewProjects(10, 0, "createdAt", "desc");

    expect(projects).toHaveLength(10);
    expect(pageInfo.page).toEqual(0);
    expect(pageInfo.pageLimit).toEqual(10);
  });
});
