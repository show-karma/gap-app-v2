import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import Projects from "@/app/projects/page";
import "@testing-library/jest-dom";

jest.mock("@/components/Pages/NewProjects", () => ({
  NewProjectsPage: () => <div data-testid="new-projects-page">New Projects Page</div>,
}));

jest.mock("@/utilities/indexer/getNewProjects", () => ({
  getNewProjects: jest.fn().mockResolvedValue({
    projects: Array(10).fill({}),
    pageInfo: {
      page: 0,
      pageLimit: 10,
      totalItems: 100,
    },
  }),
}));

describe("Projects Page", () => {
  it("renders the NewProjectsPage component", () => {
    render(<Projects />);
    expect(screen.getByTestId("new-projects-page")).toBeInTheDocument();
    expect(screen.getByText("New Projects Page")).toBeInTheDocument();
  });

  it("mocks data fetching correctly", async () => {
    const { getNewProjects } = require("@/utilities/indexer/getNewProjects");
    const { projects, pageInfo } = await getNewProjects(10, 0, "createdAt", "desc");

    expect(projects).toHaveLength(10);
    expect(pageInfo.page).toEqual(0);
    expect(pageInfo.pageLimit).toEqual(10);
  });
});
