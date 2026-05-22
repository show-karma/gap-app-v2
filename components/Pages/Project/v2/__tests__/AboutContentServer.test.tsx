import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { Project } from "@/types/v2/project";
import { AboutContentServer } from "../MainContent/AboutContentServer";

// TeamContent depends on client stores/auth — stub it out for the server render.
vi.mock("../TeamContent/TeamContent", () => ({
  TeamContent: () => <div data-testid="team-content">Team Content Mock</div>,
}));

const createMockProject = (
  details: Partial<{
    title: string;
    description: string;
    missionSummary: string;
    problem: string;
    solution: string;
    slug: string;
  }> = {}
) =>
  ({
    uid: "0x1234567890123456789012345678901234567890" as `0x${string}`,
    chainID: 1,
    owner: "0x1234567890123456789012345678901234567890" as `0x${string}`,
    details: {
      title: "Test Project",
      slug: "test-project",
      ...details,
    },
    members: [],
  }) as unknown as Project;

describe("AboutContentServer", () => {
  it("renders the empty state when no content is available", () => {
    render(<AboutContentServer project={createMockProject({})} />);
    expect(screen.getByTestId("about-content-empty")).toBeInTheDocument();
  });

  it("server-renders the description text into the HTML (not a skeleton)", () => {
    render(
      <AboutContentServer
        project={createMockProject({ description: "A unique project description" })}
      />
    );
    expect(screen.getByTestId("about-content")).toBeInTheDocument();
    expect(screen.getByTestId("about-section-description")).toBeInTheDocument();
    expect(screen.getByText("A unique project description")).toBeInTheDocument();
  });

  it("only renders sections that have content", () => {
    render(
      <AboutContentServer
        project={createMockProject({ description: "desc", missionSummary: "our mission" })}
      />
    );
    expect(screen.getByTestId("about-section-description")).toBeInTheDocument();
    expect(screen.getByTestId("about-section-mission")).toBeInTheDocument();
    expect(screen.queryByTestId("about-section-problem")).not.toBeInTheDocument();
  });

  it("renders section titles as headings for document outline", () => {
    render(<AboutContentServer project={createMockProject({ description: "desc" })} />);
    expect(screen.getByRole("heading", { name: "Description" })).toBeInTheDocument();
  });
});
