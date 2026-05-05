import { render, screen } from "@testing-library/react";
import { ProjectsSection } from "@/components/Pages/Dashboard/ProjectsSection/ProjectsSection";
import type { ProjectWithGrantsResponse } from "@/types/v2/project";

// next/dynamic resolves synchronously in test environment — mock the inner module
vi.mock("next/dynamic", () => ({
  default: (fn: () => Promise<any>, _opts?: any) => {
    const Component = (props: any) => {
      // Render a stable Create Project button placeholder
      return <button type="button">Create Project</button>;
    };
    return Component;
  },
}));

vi.mock("@/components/Dialogs/ProjectDialog/index", () => ({
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

const defaultProps = {
  isError: false,
  refetch: vi.fn(),
};

describe("ProjectsSection", () => {
  it("renders skeletons when loading", () => {
    const { container } = render(
      <ProjectsSection projects={[]} isLoading={true} {...defaultProps} />
    );

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders project cards with correct titles", () => {
    const project = createProject({
      details: { title: "Project Atlas", slug: "project-atlas" },
    });

    render(<ProjectsSection projects={[project]} isLoading={false} {...defaultProps} />);

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

    render(<ProjectsSection projects={[project]} isLoading={false} {...defaultProps} />);

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

    render(<ProjectsSection projects={[project]} isLoading={false} {...defaultProps} />);

    expect(screen.getByText("All caught up")).toBeInTheDocument();
  });

  it("renders Create Project button when projects exist", () => {
    render(<ProjectsSection projects={[createProject({})]} isLoading={false} {...defaultProps} />);

    expect(screen.getByRole("button", { name: "Create Project" })).toBeInTheDocument();
  });

  it("renders empty state and create button when there are no projects", () => {
    render(<ProjectsSection projects={[]} isLoading={false} {...defaultProps} />);

    expect(screen.getByText("My Projects")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Project" })).toBeInTheDocument();
    expect(screen.getByText("No projects yet")).toBeInTheDocument();
    expect(
      screen.getByText("Create a project to start tracking your grants and milestones.")
    ).toBeInTheDocument();
  });
});
