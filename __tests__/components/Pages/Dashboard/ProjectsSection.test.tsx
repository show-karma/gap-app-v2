import { render, screen } from "@testing-library/react";
import { ProjectsSection } from "@/components/Pages/Dashboard/ProjectsSection/ProjectsSection";
import type { ProjectWithGrantsResponse } from "@/types/v2/project";

jest.mock("@/components/Dialogs/ProjectDialog/index", () => ({
  ProjectDialog: () => <button type="button">Create Project</button>,
}));

const createProject = (overrides: Partial<ProjectWithGrantsResponse>) =>
  ({
    uid: "0xproject",
    chainID: 1,
    owner: "0xowner",
    details: {
      title: "Project Alpha",
      slug: "project-alpha",
    },
    members: [],
    grants: [],
    ...overrides,
  }) as ProjectWithGrantsResponse;

describe("ProjectsSection", () => {
  it("renders skeletons when loading", () => {
    const { container } = render(<ProjectsSection projects={[]} isLoading={true} />);

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders project cards with correct titles", () => {
    const project = createProject({
      details: { title: "Project Atlas", slug: "project-atlas" },
    });

    render(<ProjectsSection projects={[project]} isLoading={false} />);

    expect(screen.getByText("Project Atlas")).toBeInTheDocument();
  });

  it("shows pending action badge with correct count", () => {
    const project = createProject({
      grants: [
        {
          completed: null,
          milestones: [
            { completed: null, verified: [] },
            { completed: { uid: "m2" }, verified: [] },
          ],
        },
      ],
    });

    render(<ProjectsSection projects={[project]} isLoading={false} />);

    expect(screen.getByText(/1 milestone pending/)).toBeInTheDocument();
    expect(screen.getByText(/1 grant to complete/)).toBeInTheDocument();
  });

  it("shows 'All caught up' when no pending actions", () => {
    const project = createProject({
      grants: [
        {
          completed: { uid: "grant" },
          milestones: [{ completed: { uid: "m1" }, verified: [{ uid: "v1" }] }],
        },
      ],
    });

    render(<ProjectsSection projects={[project]} isLoading={false} />);

    expect(screen.getByText("All caught up")).toBeInTheDocument();
  });

  it("renders Create Project button", () => {
    render(<ProjectsSection projects={[createProject({})]} isLoading={false} />);

    expect(screen.getByRole("button", { name: "Create Project" })).toBeInTheDocument();
  });
});
