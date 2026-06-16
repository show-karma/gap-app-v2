import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ProjectHeaderServer } from "@/components/Pages/Project/v2/MainContent/ProjectHeaderServer";
import type { Project } from "@/types/v2/project";

function createMockProject(overrides?: Partial<Project["details"]>): Project {
  return {
    uid: "0xabc",
    chainID: 42161,
    owner: "0xowner",
    details: {
      title: "BuidlGuidl",
      slug: "buidlguidl",
      description: "A curated group of builders creating open-source Ethereum tools.",
      tags: ["Developer Tooling", "Education"],
      ...overrides,
    },
  } as Project;
}

describe("ProjectHeaderServer", () => {
  it("renders the project title as the page <h1>", () => {
    render(<ProjectHeaderServer project={createMockProject()} />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("BuidlGuidl");
  });

  it("server-renders the full description text (not the 200-char sidebar excerpt)", () => {
    const longDescription = `${"word ".repeat(120)}end.`;
    render(<ProjectHeaderServer project={createMockProject({ description: longDescription })} />);
    const header = screen.getByTestId("project-header-server");
    expect(header.textContent).toContain("end.");
    expect(header.textContent?.length).toBeGreaterThan(200);
  });

  it("renders category tags", () => {
    render(<ProjectHeaderServer project={createMockProject()} />);
    expect(screen.getByText("Developer Tooling")).toBeInTheDocument();
    expect(screen.getByText("Education")).toBeInTheDocument();
  });

  it("omits the tags list when there are no tags", () => {
    render(<ProjectHeaderServer project={createMockProject({ tags: [] })} />);
    expect(screen.queryByTestId("project-header-tags")).not.toBeInTheDocument();
  });

  it("still renders the h1 when the project has no description", () => {
    render(<ProjectHeaderServer project={createMockProject({ description: undefined })} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("BuidlGuidl");
  });

  it("renders nothing when the project has no title", () => {
    const { container } = render(
      <ProjectHeaderServer project={createMockProject({ title: "" })} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
