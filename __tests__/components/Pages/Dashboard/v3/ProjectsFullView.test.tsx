import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectsFullView } from "@/components/Pages/Dashboard/v3/ProjectsFullView";
import type { ProjectWithGrantsResponse } from "@/types/v2/project";

vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// The create dialog is dynamically imported; stub it to a plain button.
vi.mock("@/components/Dialogs/ProjectDialog/index", () => ({
  ProjectDialog: ({ buttonElement }: { buttonElement: { text: string } }) => (
    <button type="button">{buttonElement.text}</button>
  ),
}));

const project = (overrides: Partial<ProjectWithGrantsResponse> = {}) =>
  ({
    uid: "0xproject",
    chainID: 1,
    owner: "0xowner",
    details: { title: "Project Atlas", slug: "project-atlas" },
    members: [],
    grants: [],
    ...overrides,
  }) as ProjectWithGrantsResponse;

const defaultProps = { isLoading: false, isError: false, refetch: vi.fn() };

describe("ProjectsFullView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a card per project linking to the project overview", () => {
    render(<ProjectsFullView projects={[project()]} {...defaultProps} />);

    expect(screen.getByText("My projects")).toBeInTheDocument();
    expect(screen.getByText("Project Atlas")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Project Atlas/ })).toHaveAttribute(
      "href",
      expect.stringContaining("project-atlas")
    );
  });

  it("shows the pending-milestone badge with a pluralized grant count", () => {
    render(
      <ProjectsFullView
        projects={[
          project({
            grants: [
              {
                completed: null,
                milestones: [
                  { completed: null, verified: [] },
                  { completed: { uid: "m2" }, verified: [] },
                ],
              },
              { completed: null, milestones: [] },
            ],
          } as unknown as Partial<ProjectWithGrantsResponse>),
        ]}
        {...defaultProps}
      />
    );

    expect(screen.getByText(/1 milestone pending/)).toBeInTheDocument();
    expect(screen.getByText("2 total grants")).toBeInTheDocument();
  });

  it("falls back to a 'grant in progress' badge when no milestones are pending", () => {
    render(
      <ProjectsFullView
        projects={[
          project({
            grants: [{ completed: null, milestones: [{ completed: { uid: "m1" }, verified: [] }] }],
          } as unknown as Partial<ProjectWithGrantsResponse>),
        ]}
        {...defaultProps}
      />
    );

    expect(screen.getByText(/1 grant in progress/)).toBeInTheDocument();
    expect(screen.getByText("1 total grant")).toBeInTheDocument();
  });

  it("shows 'All caught up' when there is no pending work", () => {
    render(
      <ProjectsFullView
        projects={[
          project({
            grants: [
              {
                completed: { uid: "g1" },
                milestones: [{ completed: { uid: "m1" }, verified: [] }],
              },
            ],
          } as unknown as Partial<ProjectWithGrantsResponse>),
        ]}
        {...defaultProps}
      />
    );

    expect(screen.getByText("All caught up")).toBeInTheDocument();
  });

  it("shows the New project action when populated", async () => {
    render(<ProjectsFullView projects={[project()]} {...defaultProps} />);

    expect(await screen.findByText("New project")).toBeInTheDocument();
  });

  it("renders skeleton cards while loading", () => {
    const { container } = render(
      <ProjectsFullView projects={[]} {...defaultProps} isLoading={true} />
    );

    expect(container.querySelectorAll(".animate-dashv3-pulse").length).toBeGreaterThan(0);
  });

  it("renders an empty state with a Create project action", async () => {
    render(<ProjectsFullView projects={[]} {...defaultProps} />);

    expect(screen.getByText("No projects yet")).toBeInTheDocument();
    expect(await screen.findByText("Create project")).toBeInTheDocument();
  });

  it("surfaces an error with a retry that refetches", () => {
    const refetch = vi.fn();
    render(<ProjectsFullView projects={[]} {...defaultProps} isError={true} refetch={refetch} />);

    expect(screen.getByText("Unable to load your projects.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalled();
  });
});
