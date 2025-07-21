import { render, screen } from "@testing-library/react";
import Projects from "@/app/projects/page";
import "@testing-library/jest-dom";
import { getNewProjects } from "@/services/indexer";

jest.mock("@/components/Pages/NewProjects", () => ({
  NewProjectsPage: () => (
    <div data-testid="new-projects-page">New Projects Page</div>
  ),
}));

describe("Projects Page", () => {
  it("renders the NewProjectsPage component", () => {
    render(<Projects />);
    expect(screen.getByTestId("new-projects-page")).toBeInTheDocument();
    expect(screen.getByText("New Projects Page")).toBeInTheDocument();
  });

  //   do a test to fetch data from the indexer and render it
  it("fetches data from the indexer and renders it", async () => {
    const { projects, pageInfo } = await getNewProjects(
      10,
      0,
      "createdAt",
      "desc"
    );
    expect(projects).toHaveLength(10);
    const { page, pageLimit } = pageInfo;
    expect(page).toEqual(0);
    expect(pageLimit).toEqual(10);
  });
});
