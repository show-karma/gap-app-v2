import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { ProjectsGrid } from "@/components/CommunityGrants/ProjectsGrid";
import { ProjectVisual } from "@/components/CommunityGrants/ProjectVisual";
import type { CommunityProject } from "@/types/v2/community";

vi.mock("next/image", () => ({
  default: ({
    fill: _fill,
    priority: _priority,
    alt = "",
    ...props
  }: ComponentProps<"img"> & { fill?: boolean; priority?: boolean }) => (
    <img {...props} alt={alt} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/Utilities/MarkdownPreview", () => ({
  MarkdownPreview: ({ source }: { source?: string }) => <span>{source}</span>,
}));

const makeProject = (uid: string, overrides: Partial<CommunityProject> = {}): CommunityProject => ({
  uid,
  details: {
    title: `Project ${uid}`,
    description: `Description for ${uid}`,
    logoUrl: "",
    slug: `project-${uid}`,
  },
  categories: [],
  regions: [],
  grantNames: [],
  members: [],
  links: [],
  endorsements: [],
  contractAddresses: [],
  numMilestones: 4,
  numCompletedMilestones: 2,
  numUpdates: 3,
  percentCompleted: 50,
  numTransactions: 0,
  createdAt: "2026-06-01T00:00:00.000Z",
  ...overrides,
});

describe("ProjectVisual", () => {
  it("composes an existing project logo onto the visual", () => {
    render(
      <ProjectVisual
        uid="project-logo"
        title="Project Logo"
        imageUrl="https://example.com/logo.png"
        categories={["Infrastructure"]}
      />
    );

    expect(screen.getByTestId("project-visual")).toHaveAttribute("data-visual-source", "logo");
    expect(screen.getByRole("img", { name: "Project Logo" })).toBeInTheDocument();
    expect(screen.getByTestId("project-logo")).toHaveAttribute(
      "src",
      "https://example.com/logo.png"
    );
  });

  it("uses category artwork when no usable project image exists", () => {
    render(
      <ProjectVisual
        uid="project-storage"
        title="Storage Project"
        categories={["Decentralized storage"]}
      />
    );

    expect(screen.getByTestId("project-visual")).toHaveAttribute("data-visual-source", "category");
    expect(screen.getByLabelText("Storage project artwork")).toBeInTheDocument();
  });

  it("uses fallback artwork for remote image protocols unsupported by Next Image", () => {
    render(
      <ProjectVisual
        uid="project-http-logo"
        title="HTTP Logo"
        imageUrl="http://example.com/logo.png"
        categories={["Infrastructure"]}
      />
    );

    expect(screen.getByTestId("project-visual")).toHaveAttribute("data-visual-source", "category");
    expect(screen.queryByTestId("project-logo")).not.toBeInTheDocument();
  });

  it("uses fallback artwork for protocol-relative remote image URLs", () => {
    render(
      <ProjectVisual
        uid="project-protocol-relative-logo"
        title="Protocol Relative Logo"
        imageUrl="//example.com/logo.png"
        categories={["Infrastructure"]}
      />
    );

    expect(screen.getByTestId("project-visual")).toHaveAttribute("data-visual-source", "category");
    expect(screen.queryByTestId("project-logo")).not.toBeInTheDocument();
  });

  it("falls back to generic deterministic artwork when no category is available", () => {
    render(<ProjectVisual uid="project-generic" title="Generic Project" categories={[]} />);

    expect(screen.getByTestId("project-visual")).toHaveAttribute("data-visual-source", "generic");
    expect(screen.getByLabelText("Generic project artwork")).toBeInTheDocument();
  });

  it("infers category artwork from the project title when category metadata is empty", () => {
    render(<ProjectVisual uid="project-title" title="Curio Storage" categories={[]} />);

    expect(screen.getByTestId("project-visual")).toHaveAttribute("data-visual-source", "category");
    expect(screen.getByLabelText("Storage project artwork")).toBeInTheDocument();
  });

  it.each(["ChainSafe", "Capital DAO", "Profile Studio"])(
    "does not infer a category from a partial keyword in %s",
    (title) => {
      render(<ProjectVisual uid={title} title={title} categories={[]} />);

      expect(screen.getByTestId("project-visual")).toHaveAttribute("data-visual-source", "generic");
    }
  );

  it("strips punctuation when deriving fallback initials", () => {
    render(<ProjectVisual uid="project-ipni" title="IPNI (InterPlanetary Network Indexer)" />);

    expect(screen.getByText("II")).toBeInTheDocument();
    expect(screen.queryByText("I(")).not.toBeInTheDocument();
  });

  it("recovers from a broken project image with category artwork", () => {
    render(
      <ProjectVisual
        uid="project-broken"
        title="Broken Logo"
        imageUrl="https://example.com/broken.png"
        categories={["Developer tools"]}
      />
    );

    fireEvent.error(screen.getByTestId("project-logo"));

    expect(screen.getByTestId("project-visual")).toHaveAttribute("data-visual-source", "category");
    expect(screen.getByLabelText("Developer tools project artwork")).toBeInTheDocument();
  });

  it("tries a replacement image after the previous URL failed", () => {
    const { rerender } = render(
      <ProjectVisual
        uid="project-changing-logo"
        title="Changing Logo"
        imageUrl="https://example.com/broken.png"
        categories={["Developer tools"]}
      />
    );

    fireEvent.error(screen.getByTestId("project-logo"));
    rerender(
      <ProjectVisual
        uid="project-changing-logo"
        title="Changing Logo"
        imageUrl="https://example.com/replacement.png"
        categories={["Developer tools"]}
      />
    );

    expect(screen.getByTestId("project-visual")).toHaveAttribute("data-visual-source", "logo");
    expect(screen.getByTestId("project-logo")).toHaveAttribute(
      "src",
      "https://example.com/replacement.png"
    );
  });
});

describe("ProjectsGrid", () => {
  it("renders a visible empty state when there are no projects", () => {
    render(<ProjectsGrid projects={[]} />);

    expect(screen.getByText("No projects found")).toBeInTheDocument();
  });

  it("renders a single project as a standard project block", () => {
    render(<ProjectsGrid projects={[makeProject("only-project")]} />);

    expect(screen.queryByText("Project spotlight")).not.toBeInTheDocument();
    expect(screen.getByTestId("project-block")).toBeInTheDocument();
  });

  it("renders every project as an equal square-image block", () => {
    const projects = [
      makeProject("featured", {
        details: {
          title: "Featured Project",
          description: "Featured description",
          logoUrl: "https://example.com/featured.png",
          slug: "featured-project",
        },
        categories: ["Infrastructure"],
      }),
      makeProject("storage", {
        details: {
          title: "Storage Project",
          description: "Storage description",
          logoUrl: "",
          slug: "storage-project",
        },
        categories: ["Storage"],
      }),
      makeProject("generic"),
    ];

    render(<ProjectsGrid projects={projects} />);

    expect(screen.queryByText("Project spotlight")).not.toBeInTheDocument();
    expect(screen.getAllByText("Featured Project")).toHaveLength(1);
    expect(screen.getByRole("link", { name: /featured project/i })).toHaveAttribute(
      "href",
      "/project/featured-project"
    );
    expect(screen.getByRole("link", { name: /storage project/i })).toHaveAttribute(
      "href",
      "/project/storage-project"
    );
    expect(screen.queryByText("Infrastructure")).not.toBeInTheDocument();
    expect(screen.queryByText("Storage")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("project-block")).toHaveLength(3);
    expect(screen.queryByText(/^Added /)).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});
