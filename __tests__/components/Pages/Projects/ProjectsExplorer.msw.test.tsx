/**
 * ProjectsExplorer component tests using MSW for data fetching.
 *
 * Tests loading, success, error, and empty states for the projects
 * explorer page with infinite scroll pagination.
 */
import { screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { createMockProject } from "@/__tests__/factories/project.factory";
import { resetSeq } from "@/__tests__/factories/utils";
import { installMswLifecycle, server } from "@/__tests__/msw/server";
import { renderWithProviders } from "@/__tests__/utils/render";
import { ProjectsExplorer } from "@/components/Pages/Projects/ProjectsExplorer";

const BASE = "http://localhost:4000";

// nuqs uses useSearchParams/useRouter internally — mock for jsdom
vi.mock("nuqs", () => ({
  useQueryState: vi.fn((_key: string, options?: { defaultValue?: string }) => {
    return [options?.defaultValue ?? "", vi.fn()];
  }),
}));

// MarkdownPreview pulls in heavy editor deps — provide lightweight stub
vi.mock("@/components/Utilities/MarkdownPreview", () => ({
  MarkdownPreview: ({ source }: { source: string }) => (
    <span data-testid="markdown-preview">{source}</span>
  ),
}));

// ProfilePicture touches Image component — lightweight stub
vi.mock("@/components/Utilities/ProfilePicture", () => ({
  ProfilePicture: ({ name }: { name: string }) => (
    <span data-testid={`profile-pic-${name}`}>{name}</span>
  ),
}));

// Mock next/link
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// The component imports queryClient directly for removeQueries — mock it
vi.mock("@/utilities/query-client", () => ({
  queryClient: {
    removeQueries: vi.fn(),
  },
}));

installMswLifecycle();

function buildPaginatedResponse(
  projects: ReturnType<typeof createMockProject>[],
  page = 1,
  hasNextPage = false
) {
  return {
    payload: projects.map((p) => ({
      uid: p.uid,
      chainID: p.chainID,
      owner: p.owner,
      details: p.details,
      members: p.members,
      createdAt: "2024-06-15T09:00:00Z",
      updatedAt: "2024-06-15T09:00:00Z",
      stats: {
        grantsCount: 2,
        grantMilestonesCount: 5,
        roadmapItemsCount: 3,
      },
    })),
    pagination: {
      totalCount: projects.length,
      page,
      limit: 12,
      totalPages: 1,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
      hasNextPage,
      hasPrevPage: page > 1,
    },
  };
}

describe("ProjectsExplorer", () => {
  beforeEach(() => {
    resetSeq();
  });

  describe("success state", () => {
    it("renders project cards with titles and stats", async () => {
      const project = createMockProject({
        details: {
          title: "DeFi Dashboard",
          slug: "defi-dashboard",
          description: "A DeFi tracking dashboard",
        },
      });

      const response = buildPaginatedResponse([project]);

      server.use(
        http.get(`${BASE}/v2/projects`, () => {
          return HttpResponse.json(response);
        })
      );

      renderWithProviders(<ProjectsExplorer />);

      await waitFor(
        () => {
          // Title appears twice: in ProfilePicture mock and in h3 heading
          const matches = screen.getAllByText("DeFi Dashboard");
          expect(matches.length).toBeGreaterThanOrEqual(1);
        },
        { timeout: 5000 }
      );

      // Check stats badge
      expect(screen.getByText("2 grants")).toBeInTheDocument();
      expect(screen.getByText("5 milestones")).toBeInTheDocument();
      expect(screen.getByText("3 roadmap items")).toBeInTheDocument();
    });

    it("shows total project count in header", async () => {
      const projects = [
        createMockProject({
          details: { title: "Project Alpha", slug: "alpha" },
        }),
      ];

      const response = buildPaginatedResponse(projects);
      response.pagination.totalCount = 42;

      server.use(
        http.get(`${BASE}/v2/projects`, () => {
          return HttpResponse.json(response);
        })
      );

      renderWithProviders(<ProjectsExplorer />);

      await waitFor(() => {
        expect(screen.getByText("42 projects found")).toBeInTheDocument();
      });
    });

    it("shows singular 'project' when count is 1", async () => {
      const projects = [
        createMockProject({
          details: { title: "Solo Project", slug: "solo" },
        }),
      ];

      const response = buildPaginatedResponse(projects);
      response.pagination.totalCount = 1;

      server.use(
        http.get(`${BASE}/v2/projects`, () => {
          return HttpResponse.json(response);
        })
      );

      renderWithProviders(<ProjectsExplorer />);

      await waitFor(() => {
        expect(screen.getByText("1 project found")).toBeInTheDocument();
      });
    });

    it("shows Load More button when hasNextPage is true", async () => {
      const projects = [
        createMockProject({
          details: {
            title: "Page One Project",
            slug: "page-one",
            description: "First page description",
          },
        }),
      ];

      server.use(
        http.get(`${BASE}/v2/projects`, () => {
          return HttpResponse.json(buildPaginatedResponse(projects, 1, true));
        })
      );

      renderWithProviders(<ProjectsExplorer />);

      await waitFor(
        () => {
          // Check for the Load More button presence (appears when hasNextPage)
          expect(screen.getByRole("button", { name: /load more projects/i })).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });

    it("shows end-of-results message when no more pages", async () => {
      const projects = [
        createMockProject({
          details: {
            title: "Only Project",
            slug: "only",
            description: "Sole project in the system",
          },
        }),
      ];

      const response = buildPaginatedResponse(projects);
      response.pagination.totalCount = 1;

      server.use(
        http.get(`${BASE}/v2/projects`, () => {
          return HttpResponse.json(response);
        })
      );

      renderWithProviders(<ProjectsExplorer />);

      await waitFor(
        () => {
          expect(screen.getByText(/showing all 1 project/i)).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });
  });

  describe("error state", () => {
    it("shows error message when API returns 500", async () => {
      server.use(
        http.get(`${BASE}/v2/projects`, () => {
          return HttpResponse.json({ error: "Internal server error" }, { status: 500 });
        })
      );

      renderWithProviders(<ProjectsExplorer />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load projects. Please try again.")).toBeInTheDocument();
      });
    });
  });

  describe("empty state", () => {
    it("shows empty message when no projects returned", async () => {
      server.use(
        http.get(`${BASE}/v2/projects`, () => {
          return HttpResponse.json(buildPaginatedResponse([]));
        })
      );

      renderWithProviders(<ProjectsExplorer />);

      await waitFor(() => {
        expect(screen.getByText("No projects available")).toBeInTheDocument();
      });
    });
  });

  describe("page structure", () => {
    it("renders the heading and search input", async () => {
      server.use(
        http.get(`${BASE}/v2/projects`, () => {
          return HttpResponse.json(buildPaginatedResponse([]));
        })
      );

      renderWithProviders(<ProjectsExplorer />);

      expect(screen.getByText("Projects on Karma")).toBeInTheDocument();

      expect(screen.getByRole("textbox", { name: /search projects/i })).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("shows loading skeletons while data is being fetched", () => {
      server.use(
        http.get(`${BASE}/v2/projects`, () => {
          return new Promise(() => {});
        })
      );

      const { container } = renderWithProviders(<ProjectsExplorer />);

      // The loading component renders aria-label="Loading projects"
      expect(container.querySelector('[aria-label="Loading projects"]')).toBeInTheDocument();
    });
  });
});
