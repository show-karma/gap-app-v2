/**
 * Project Page Accessibility Tests
 * Tests WCAG 2.2 AA compliance using jest-axe
 *
 * Tests render a representative project page component to verify accessibility
 * patterns: project details, milestone lists, side panels.
 *
 * Target: 6 tests
 */

import { render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import "@testing-library/jest-dom";

expect.extend(toHaveNoViolations);

/**
 * Representative ProjectHeader component matching the real app patterns.
 */
function ProjectHeader({
  title,
  description,
  logoUrl,
  tags,
  links,
}: {
  title: string;
  description: string;
  logoUrl: string;
  tags: string[];
  links: Array<{ type: string; url: string }>;
}) {
  return (
    <header>
      <div className="flex items-center gap-4">
        <img src={logoUrl} alt={`${title} logo`} className="w-12 h-12 rounded-full" />
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-gray-600">{description}</p>
        </div>
      </div>
      <div className="flex gap-2 mt-3" role="list" aria-label="Project tags">
        {tags.map((tag) => (
          <span key={tag} role="listitem" className="px-2 py-0.5 bg-gray-100 rounded text-sm">
            {tag}
          </span>
        ))}
      </div>
      <nav aria-label="Project links" className="flex gap-3 mt-3">
        {links.map((link) => (
          <a
            key={link.type}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm"
          >
            {link.type.charAt(0).toUpperCase() + link.type.slice(1)}
          </a>
        ))}
      </nav>
    </header>
  );
}

function MilestoneCard({
  title,
  status,
  description,
}: {
  title: string;
  status: "completed" | "in-progress" | "pending";
  description: string;
}) {
  const statusLabels: Record<string, string> = {
    completed: "Completed",
    "in-progress": "In Progress",
    pending: "Pending",
  };

  return (
    <article aria-label={`Milestone: ${title}`} className="border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{title}</h3>
        <span role="status" className="text-xs font-medium">
          {statusLabels[status]}
        </span>
      </div>
      <p className="text-sm text-gray-600 mt-1">{description}</p>
    </article>
  );
}

function ProjectPage({
  project,
  milestones,
  isLoading,
  isError,
}: {
  project: {
    title: string;
    description: string;
    logoUrl: string;
    tags: string[];
    links: Array<{ type: string; url: string }>;
    members: Array<{ address: string; role: string }>;
  } | null;
  milestones: Array<{
    id: string;
    title: string;
    status: "completed" | "in-progress" | "pending";
    description: string;
  }>;
  isLoading: boolean;
  isError: boolean;
}) {
  if (isLoading) {
    return (
      <main className="p-6 max-w-4xl mx-auto">
        <div aria-busy="true" role="status">
          Loading project...
        </div>
      </main>
    );
  }

  if (isError || !project) {
    return (
      <main className="p-6 max-w-4xl mx-auto">
        <div role="alert" className="text-red-600">
          {isError ? "Error loading project. Please try again." : "Project not found."}
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <ProjectHeader {...project} />

      <section aria-labelledby="milestones-heading" className="mt-8">
        <h2 id="milestones-heading" className="text-xl font-semibold mb-4">
          Milestones
        </h2>
        {milestones.length === 0 ? (
          <p className="text-gray-500">No milestones yet.</p>
        ) : (
          <div className="space-y-3">
            {milestones.map((milestone) => (
              <MilestoneCard key={milestone.id} {...milestone} />
            ))}
          </div>
        )}
      </section>

      <aside aria-label="Project team" className="mt-8 border-t pt-6">
        <h2 className="text-lg font-semibold mb-3">Team Members</h2>
        <ul>
          {project.members.map((member) => (
            <li key={member.address} className="flex items-center gap-2 py-1">
              <span className="text-sm font-mono">
                {member.address.slice(0, 6)}...{member.address.slice(-4)}
              </span>
              <span className="text-xs text-gray-500">{member.role}</span>
            </li>
          ))}
        </ul>
      </aside>
    </main>
  );
}

const mockProject = {
  title: "Karma Protocol",
  description: "A decentralized reputation and grant tracking protocol.",
  logoUrl: "https://storage.karma.fund/logo.png",
  tags: ["grants", "accountability", "attestations"],
  links: [
    { type: "website", url: "https://karma.fund" },
    { type: "twitter", url: "https://twitter.com/karmahq" },
    { type: "github", url: "https://github.com/karma-protocol" },
  ],
  members: [
    { address: "0x1234567890123456789012345678901234567890", role: "Owner" },
    { address: "0xabcdef0123456789abcdef0123456789abcdef01", role: "Member" },
  ],
};

const mockMilestones = [
  {
    id: "ms-1",
    title: "MVP Launch",
    status: "completed" as const,
    description: "Launch the minimum viable product with core attestation features.",
  },
  {
    id: "ms-2",
    title: "Multi-chain Support",
    status: "in-progress" as const,
    description: "Extend support to Arbitrum, Base, and Polygon networks.",
  },
  {
    id: "ms-3",
    title: "Analytics Dashboard",
    status: "pending" as const,
    description: "Build a comprehensive analytics dashboard for grant tracking.",
  },
];

describe("Project Page Accessibility", () => {
  it("project page with data passes axe", async () => {
    const { container } = render(
      <ProjectPage
        project={mockProject}
        milestones={mockMilestones}
        isLoading={false}
        isError={false}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("loading state passes axe", async () => {
    const { container } = render(
      <ProjectPage project={null} milestones={[]} isLoading={true} isError={false} />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("error state passes axe", async () => {
    const { container } = render(
      <ProjectPage project={null} milestones={[]} isLoading={false} isError={true} />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("proper heading hierarchy is maintained", () => {
    const { container } = render(
      <ProjectPage
        project={mockProject}
        milestones={mockMilestones}
        isLoading={false}
        isError={false}
      />
    );

    const h1 = container.querySelector("h1");
    expect(h1).toBeInTheDocument();
    expect(h1?.textContent).toBe("Karma Protocol");

    const h2s = container.querySelectorAll("h2");
    expect(h2s.length).toBe(2); // "Milestones" and "Team Members"

    const h3s = container.querySelectorAll("h3");
    expect(h3s.length).toBe(mockMilestones.length);

    // No heading level skipped
    const headings = container.querySelectorAll("h1, h2, h3, h4, h5, h6");
    const levels = Array.from(headings).map((h) => Number.parseInt(h.tagName.replace("H", ""), 10));
    expect(levels[0]).toBe(1);
    // All subsequent headings should not skip levels
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    }
  });

  it("landmark regions are properly defined", () => {
    render(
      <ProjectPage
        project={mockProject}
        milestones={mockMilestones}
        isLoading={false}
        isError={false}
      />
    );

    // Main landmark
    expect(screen.getByRole("main")).toBeInTheDocument();

    // Navigation for project links
    expect(screen.getByRole("navigation", { name: /project links/i })).toBeInTheDocument();

    // Complementary aside for team
    expect(screen.getByRole("complementary", { name: /project team/i })).toBeInTheDocument();

    // Milestone section
    const milestonesSection = screen.getByRole("region", { name: /milestones/i });
    expect(milestonesSection).toBeInTheDocument();
  });

  it("external links have security attributes and accessible names", () => {
    const { container } = render(
      <ProjectPage
        project={mockProject}
        milestones={mockMilestones}
        isLoading={false}
        isError={false}
      />
    );

    const externalLinks = container.querySelectorAll("a[target='_blank']");
    expect(externalLinks.length).toBe(mockProject.links.length);

    for (const link of Array.from(externalLinks)) {
      // Security: noopener noreferrer
      const rel = link.getAttribute("rel");
      expect(rel).toContain("noopener");
      expect(rel).toContain("noreferrer");

      // Accessible text content
      expect(link.textContent?.trim().length).toBeGreaterThan(0);
    }

    // Milestone cards should have accessible labels
    for (const milestone of mockMilestones) {
      const article = screen.getByLabelText(`Milestone: ${milestone.title}`);
      expect(article).toBeInTheDocument();
    }
  });
});
