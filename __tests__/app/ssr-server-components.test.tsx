/**
 * SSR tests for server components.
 *
 * Tests server components by calling them as async functions, rendering
 * the returned JSX, and asserting the output. Uses MSW to intercept
 * data-fetching calls made during server rendering.
 */
import { render, screen } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { createMockCommunity } from "@/__tests__/factories/community.factory";
import { createMockProject } from "@/__tests__/factories/project.factory";
import { resetSeq } from "@/__tests__/factories/utils";
import { installMswLifecycle, server } from "@/__tests__/msw/server";

const BASE = "http://localhost:4000";

// Mock next/navigation server functions
const mockNotFound = vi.fn();
// Server components here read the request host to detect whitelabel tenants,
// and these tests render them outside a Next request scope.
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: "www.karmahq.org" }),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    mockNotFound();
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: vi.fn(),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
  useParams: vi.fn(() => ({})),
  useSearchParams: vi.fn(() => ({
    get: vi.fn(),
    getAll: vi.fn(() => []),
    toString: vi.fn(() => ""),
  })),
  usePathname: vi.fn(() => "/"),
}));

// Mock pagesOnRoot to avoid collisions with test slugs
vi.mock("@/utilities/pagesOnRoot", () => ({
  pagesOnRoot: [],
}));

// Mock CommunityGrants — heavy client component not relevant to SSR test
vi.mock("@/components/CommunityGrants", () => ({
  CommunityGrants: ({
    communityUid,
    categoriesOptions,
    initialProjects,
    initialPage,
    paginationBasePath,
  }: {
    communityUid: string;
    categoriesOptions: string[];
    initialProjects: { payload: unknown[] };
    initialPage?: number;
    paginationBasePath: string;
  }) => (
    <div data-testid="community-grants">
      <span data-testid="community-uid">{communityUid}</span>
      <span data-testid="categories-count">{categoriesOptions.length}</span>
      <span data-testid="projects-count">{initialProjects.payload.length}</span>
      <span data-testid="initial-page">{initialPage}</span>
      <span data-testid="pagination-base-path">{paginationBasePath}</span>
    </div>
  ),
}));

// Mock ProjectRoadmap — heavy client component
vi.mock("@/components/Pages/Project/Roadmap", () => ({
  ProjectRoadmap: ({ project }: { project: { details?: { title?: string } } }) => (
    <div data-testid="project-roadmap">
      <span data-testid="project-title">{project?.details?.title ?? "Unknown"}</span>
    </div>
  ),
}));

// Mock HydrationBoundary
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    HydrationBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    dehydrate: vi.fn(() => ({})),
  };
});

// Mock getProjectCachedData
const mockGetProjectCachedData = vi.fn();
vi.mock("@/utilities/queries/getProjectCachedData", () => ({
  getProjectCachedData: (...args: unknown[]) => mockGetProjectCachedData(...args),
}));

// Mock getProjectUpdates
vi.mock("@/services/project-updates.service", () => ({
  getProjectUpdates: vi.fn(() => Promise.resolve([])),
}));

// Mock defaultQueryOptions
vi.mock("@/utilities/queries/defaultOptions", () => ({
  defaultQueryOptions: { retry: false, staleTime: 0 },
}));

// Mock metadata utilities
vi.mock("@/utilities/metadata/projectMetadata", () => ({
  generateProjectUpdatesMetadata: vi.fn(() => ({
    title: "Test Project Updates",
  })),
}));

installMswLifecycle();

describe("SSR Server Components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSeq();
  });

  describe("CommunityProjectsPage", () => {
    // Dynamically import after mocks are set up
    const importPage = async () => {
      const mod = await import("@/app/community/[communityId]/(with-header)/projects/page");
      return mod.default;
    };

    it("renders CommunityGrants with fetched data on success", async () => {
      const community = createMockCommunity({
        uid: "0xcommunity123" as `0x${string}`,
        details: {
          name: "Test Community",
          slug: "test-community",
          imageURL: "https://example.com/logo.png",
        },
      });

      const project = createMockProject({
        details: { title: "Test Project", slug: "test-project" },
      });

      // Set up MSW handlers for the 3 parallel fetches
      server.use(
        http.get(`${BASE}/v2/communities/:slug`, () => {
          return HttpResponse.json(community);
        }),
        http.get(`${BASE}/communities/:slug/categories`, () => {
          return HttpResponse.json([
            { name: "DeFi", id: "1" },
            { name: "Infrastructure", id: "2" },
          ]);
        }),
        http.get(`${BASE}/v2/communities/:slug/projects`, () => {
          return HttpResponse.json({
            payload: [project],
            pagination: {
              totalCount: 1,
              page: 1,
              limit: 12,
              totalPages: 1,
              nextPage: null,
              prevPage: null,
              hasNextPage: false,
              hasPrevPage: false,
            },
          });
        })
      );

      const CommunityProjectsPage = await importPage();
      const jsx = await CommunityProjectsPage({
        params: Promise.resolve({ communityId: "test-community" }),
        searchParams: Promise.resolve({}),
      });

      render(jsx);

      // Verify the community UID was passed to CommunityGrants
      expect(screen.getByTestId("community-uid")).toHaveTextContent(community.uid);

      // Verify categories were fetched and sorted
      expect(screen.getByTestId("categories-count")).toHaveTextContent("2");

      // Verify projects were fetched
      expect(screen.getByTestId("projects-count")).toHaveTextContent("1");
    });

    /**
     * The seed is only usable if the server asks the indexer for exactly what
     * the client's first query would ask for. Pins page/limit/sortBy on the wire
     * (the server used to omit sortBy while the client sent sortBy=milestones)
     * and the ?page= pass-through that makes the crawlable links resolvable.
     */
    const renderProjectsPageCapturingIndexerUrl = async (
      searchParams: Record<string, string | string[] | undefined>
    ) => {
      const community = createMockCommunity({
        uid: "0xpagedcommunity" as `0x${string}`,
        details: { name: "Paged Community", slug: "paged-community" },
      });
      let projectsRequestUrl = "";

      server.use(
        http.get(`${BASE}/v2/communities/:slug`, () => HttpResponse.json(community)),
        http.get(`${BASE}/communities/:slug/categories`, () => HttpResponse.json([])),
        http.get(`${BASE}/v2/communities/:slug/projects`, ({ request }) => {
          projectsRequestUrl = request.url;
          return HttpResponse.json({
            payload: [createMockProject({ details: { title: "Paged", slug: "paged" } })],
            pagination: {
              totalCount: 24,
              page: 1,
              limit: 12,
              totalPages: 2,
              nextPage: 2,
              prevPage: null,
              hasNextPage: true,
              hasPrevPage: false,
            },
          });
        })
      );

      const CommunityProjectsPage = await importPage();
      const jsx = await CommunityProjectsPage({
        params: Promise.resolve({ communityId: "paged-community" }),
        searchParams: Promise.resolve(searchParams),
      });
      render(jsx);

      return new URL(projectsRequestUrl).searchParams;
    };

    it("fetches page 1 with the explicit default sort when no page param is present", async () => {
      const query = await renderProjectsPageCapturingIndexerUrl({});

      expect(query.get("page")).toBe("1");
      expect(query.get("limit")).toBe("12");
      expect(query.get("sortBy")).toBe("milestones");
      expect(screen.getByTestId("initial-page")).toHaveTextContent("1");
      expect(screen.getByTestId("pagination-base-path")).toHaveTextContent(
        "/community/paged-community/projects"
      );
    });

    it("forwards ?page=2 to the indexer and to CommunityGrants", async () => {
      const query = await renderProjectsPageCapturingIndexerUrl({ page: "2" });

      expect(query.get("page")).toBe("2");
      expect(query.get("limit")).toBe("12");
      expect(query.get("sortBy")).toBe("milestones");
      expect(screen.getByTestId("initial-page")).toHaveTextContent("2");
    });

    it("falls back to page 1 for a malformed page param", async () => {
      const query = await renderProjectsPageCapturingIndexerUrl({ page: "-3" });

      expect(query.get("page")).toBe("1");
      expect(screen.getByTestId("initial-page")).toHaveTextContent("1");
    });

    it("calls notFound when community details are null", async () => {
      server.use(
        http.get(`${BASE}/v2/communities/:slug`, () => {
          return HttpResponse.json(null);
        }),
        http.get(`${BASE}/communities/:slug/categories`, () => {
          return HttpResponse.json([]);
        }),
        http.get(`${BASE}/v2/communities/:slug/projects`, () => {
          return HttpResponse.json({
            payload: [],
            pagination: {
              totalCount: 0,
              page: 1,
              limit: 12,
              totalPages: 0,
            },
          });
        })
      );

      const CommunityProjectsPage = await importPage();

      await expect(
        CommunityProjectsPage({
          params: Promise.resolve({ communityId: "nonexistent" }),
          searchParams: Promise.resolve({}),
        })
      ).rejects.toThrow("NEXT_NOT_FOUND");

      expect(mockNotFound).toHaveBeenCalled();
    });

    it("handles empty categories and projects gracefully", async () => {
      const community = createMockCommunity({
        uid: "0xemptycommunity" as `0x${string}`,
        details: {
          name: "Empty Community",
          slug: "empty-community",
        },
      });

      server.use(
        http.get(`${BASE}/v2/communities/:slug`, () => {
          return HttpResponse.json(community);
        }),
        http.get(`${BASE}/communities/:slug/categories`, () => {
          return HttpResponse.json([]);
        }),
        http.get(`${BASE}/v2/communities/:slug/projects`, () => {
          return HttpResponse.json({
            payload: [],
            pagination: {
              totalCount: 0,
              page: 1,
              limit: 12,
              totalPages: 0,
              nextPage: null,
              prevPage: null,
              hasNextPage: false,
              hasPrevPage: false,
            },
          });
        })
      );

      const CommunityProjectsPage = await importPage();
      const jsx = await CommunityProjectsPage({
        params: Promise.resolve({ communityId: "empty-community" }),
        searchParams: Promise.resolve({}),
      });

      render(jsx);

      expect(screen.getByTestId("categories-count")).toHaveTextContent("0");
      expect(screen.getByTestId("projects-count")).toHaveTextContent("0");
    });
  });

  describe("RoadmapPage (Project Updates)", () => {
    const importPage = async () => {
      const mod = await import("@/app/project/[projectId]/updates/page");
      return mod.default;
    };

    it("renders ProjectRoadmap with fetched project data", async () => {
      mockGetProjectCachedData.mockResolvedValue({
        uid: "0xproject1",
        chainID: 10,
        details: { title: "My Roadmap Project", slug: "roadmap-project" },
        members: [],
      });

      const RoadmapPage = await importPage();
      const jsx = await RoadmapPage({
        params: Promise.resolve({ projectId: "roadmap-project" }),
      });

      render(jsx);

      expect(screen.getByTestId("project-roadmap")).toBeInTheDocument();
      expect(screen.getByTestId("project-title")).toHaveTextContent("My Roadmap Project");
    });

    it("returns null when project is not found", async () => {
      mockGetProjectCachedData.mockResolvedValue(null);

      const RoadmapPage = await importPage();
      const result = await RoadmapPage({
        params: Promise.resolve({ projectId: "nonexistent-project" }),
      });

      expect(result).toBeNull();
    });
  });

  describe("CommunityMainPage (with-header)", () => {
    const importPage = async () => {
      const mod = await import("@/app/community/[communityId]/(with-header)/page");
      return mod.default;
    };

    it("renders community grants with server-fetched data", async () => {
      const community = createMockCommunity({
        uid: "0xmaincommunity" as `0x${string}`,
        details: {
          name: "Main Community",
          slug: "main-community",
          imageURL: "https://example.com/main.png",
        },
      });

      server.use(
        http.get(`${BASE}/v2/communities/:slug`, () => {
          return HttpResponse.json(community);
        }),
        http.get(`${BASE}/communities/:slug/categories`, () => {
          return HttpResponse.json([{ name: "Governance", id: "g1" }]);
        }),
        http.get(`${BASE}/v2/communities/:slug/projects`, () => {
          return HttpResponse.json({
            payload: [],
            pagination: {
              totalCount: 0,
              page: 1,
              limit: 12,
              totalPages: 0,
              nextPage: null,
              prevPage: null,
              hasNextPage: false,
              hasPrevPage: false,
            },
          });
        })
      );

      const CommunityMainPage = await importPage();
      const jsx = await CommunityMainPage({
        params: Promise.resolve({ communityId: "main-community" }),
        searchParams: Promise.resolve({}),
      });

      render(jsx);

      expect(screen.getByTestId("community-grants")).toBeInTheDocument();
      expect(screen.getByTestId("community-uid")).toHaveTextContent(community.uid);
      expect(screen.getByTestId("categories-count")).toHaveTextContent("1");
    });

    it("calls notFound for missing community", async () => {
      server.use(
        http.get(`${BASE}/v2/communities/:slug`, () => {
          return HttpResponse.json(null);
        }),
        http.get(`${BASE}/communities/:slug/categories`, () => {
          return HttpResponse.json([]);
        }),
        http.get(`${BASE}/v2/communities/:slug/projects`, () => {
          return HttpResponse.json({
            payload: [],
            pagination: {
              totalCount: 0,
              page: 1,
              limit: 12,
              totalPages: 0,
            },
          });
        })
      );

      const CommunityMainPage = await importPage();

      await expect(
        CommunityMainPage({
          params: Promise.resolve({ communityId: "missing" }),
          searchParams: Promise.resolve({}),
        })
      ).rejects.toThrow("NEXT_NOT_FOUND");
    });
  });
});
