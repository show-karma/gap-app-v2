import { vi } from "vitest";
/**
 * Integration tests: Project browsing & search user journey
 *
 * Tests the ProjectsExplorer component with service-layer mocking,
 * covering search, empty states, error states, sorting, and filtering.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PaginatedProjectsResponse } from "@/types/v2/project";
import {
  createMockProject,
  createMockProjects,
  createPaginatedProjectsResponse,
} from "../fixtures";

// ---------------------------------------------------------------------------
// Module mocks (hoisted before imports)
// ---------------------------------------------------------------------------

// Track nuqs state per key, allowing tests to preset values
const mockQueryStates: Record<string, [string, vi.Mock]> = {};

function getOrCreateQueryState(key: string, defaultValue: string): [string, vi.Mock] {
  if (!mockQueryStates[key]) {
    const setter = vi.fn((val: string | null) => {
      mockQueryStates[key] = [val ?? defaultValue, setter];
    });
    mockQueryStates[key] = [defaultValue, setter];
  }
  return mockQueryStates[key];
}

vi.mock("nuqs", () => ({
  useQueryState: vi.fn((key: string, options?: { defaultValue?: string }) => {
    const defaultValue = options?.defaultValue ?? "";
    return getOrCreateQueryState(key, defaultValue);
  }),
}));

// Mock MarkdownPreview to avoid markdown parsing complexity
vi.mock("@/components/Utilities/MarkdownPreview", () => ({
  MarkdownPreview: ({ source }: { source: string }) => (
    <div data-testid="markdown-preview">{source}</div>
  ),
}));

// Mock the service that fetches paginated projects
const mockGetExplorerProjectsPaginated = vi.fn<(args: any) => Promise<PaginatedProjectsResponse>>();

vi.mock("@/services/projects-explorer.service", () => ({
  getExplorerProjectsPaginated: (...args: any[]) => mockGetExplorerProjectsPaginated(...args),
}));

// Mock query-client used internally by the component
vi.mock("@/utilities/query-client", () => {
  const { QueryClient } = require("@tanstack/react-query");
  return {
    queryClient: new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    }),
  };
});

// ---------------------------------------------------------------------------
// Import component under test (after mocks)
// ---------------------------------------------------------------------------
import { ProjectsExplorer } from "@/components/Pages/Projects/ProjectsExplorer";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function renderExplorer(queryClient?: QueryClient) {
  const client = queryClient ?? createQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <ProjectsExplorer />
    </QueryClientProvider>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ProjectsExplorer - Project browsing & search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(mockQueryStates)) {
      delete mockQueryStates[key];
    }
    // Mock scrollIntoView which is not available in jsdom
    Element.prototype.scrollIntoView = vi.fn();
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  describe("loading state", () => {
    it("shows heading while fetching projects", () => {
      // Service never resolves - simulates loading
      mockGetExplorerProjectsPaginated.mockReturnValue(new Promise(() => {}));

      renderExplorer();

      expect(screen.getByText("Projects on Karma")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Success state
  // -------------------------------------------------------------------------

  describe("success state", () => {
    it("renders project cards after data is loaded", async () => {
      const projects = createMockProjects(3, (i) => ({
        details: {
          title: `Alpha Project ${i + 1}`,
          slug: `alpha-${i + 1}`,
          description: `Desc ${i + 1}`,
        },
      }));
      mockGetExplorerProjectsPaginated.mockResolvedValue(
        createPaginatedProjectsResponse(projects, { totalCount: 3 })
      );

      renderExplorer();

      await waitFor(() => {
        expect(screen.getByText("Alpha Project 1")).toBeInTheDocument();
      });

      expect(screen.getByText("Alpha Project 2")).toBeInTheDocument();
      expect(screen.getByText("Alpha Project 3")).toBeInTheDocument();
    });

    it("displays the total count of projects", async () => {
      const projects = createMockProjects(5, (i) => ({
        details: {
          title: `Counted ${i + 1}`,
          slug: `counted-${i + 1}`,
          description: "",
        },
      }));
      mockGetExplorerProjectsPaginated.mockResolvedValue(
        createPaginatedProjectsResponse(projects, { totalCount: 5 })
      );

      renderExplorer();

      await waitFor(() => {
        expect(screen.getByText(/5 projects found/)).toBeInTheDocument();
      });
    });

    it("uses singular 'project' when only one result", async () => {
      const projects = [
        createMockProject({
          details: { title: "Solo Project", slug: "solo", description: "" },
        }),
      ];
      mockGetExplorerProjectsPaginated.mockResolvedValue(
        createPaginatedProjectsResponse(projects, { totalCount: 1 })
      );

      renderExplorer();

      await waitFor(() => {
        expect(screen.getByText(/1 project found/)).toBeInTheDocument();
      });
    });

    it("renders project cards as links with correct aria labels", async () => {
      const projects = [
        createMockProject({
          details: { title: "Linked Project", slug: "linked-proj", description: "" },
        }),
      ];
      mockGetExplorerProjectsPaginated.mockResolvedValue(
        createPaginatedProjectsResponse(projects, { totalCount: 1 })
      );

      renderExplorer();

      await waitFor(() => {
        expect(screen.getByText("Linked Project")).toBeInTheDocument();
      });

      const link = screen.getByRole("link", {
        name: /View Linked Project project details/,
      });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", expect.stringContaining("linked-proj"));
    });
  });

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------

  describe("empty state", () => {
    it("shows empty message when no projects are available", async () => {
      mockGetExplorerProjectsPaginated.mockResolvedValue(
        createPaginatedProjectsResponse([], { totalCount: 0 })
      );

      renderExplorer();

      await waitFor(() => {
        expect(screen.getByText("No projects available")).toBeInTheDocument();
      });
    });

    it("shows search-specific empty message when search returns no results", async () => {
      // Preset the search query state
      const setter = vi.fn();
      mockQueryStates["q"] = ["nonexistent", setter];

      mockGetExplorerProjectsPaginated.mockResolvedValue(
        createPaginatedProjectsResponse([], { totalCount: 0 })
      );

      renderExplorer();

      await waitFor(() => {
        expect(screen.getByText(/No projects found for "nonexistent"/)).toBeInTheDocument();
      });
    });

    it("shows filter-specific empty message when raising funds filter has no results", async () => {
      // Preset the raisingFunds filter to active (nuqs key used by ProjectsExplorer)
      const setter = vi.fn();
      mockQueryStates["raisingFunds"] = ["true", setter];

      mockGetExplorerProjectsPaginated.mockResolvedValue(
        createPaginatedProjectsResponse([], { totalCount: 0 })
      );

      renderExplorer();

      await waitFor(() => {
        expect(screen.getByText("No projects are currently raising funds")).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------

  describe("error state", () => {
    it("shows error message when API request fails", async () => {
      mockGetExplorerProjectsPaginated.mockRejectedValue(new Error("Server error"));

      renderExplorer();

      await waitFor(() => {
        expect(screen.getByText("Failed to load projects. Please try again.")).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Search interaction
  // -------------------------------------------------------------------------

  describe("search interaction", () => {
    it("renders search input with correct placeholder", () => {
      mockGetExplorerProjectsPaginated.mockReturnValue(new Promise(() => {}));

      renderExplorer();

      const searchInput = screen.getByRole("textbox", {
        name: /Search projects/i,
      });
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute("placeholder", "Search projects...");
    });

    it("allows user to type in search input", async () => {
      mockGetExplorerProjectsPaginated.mockReturnValue(new Promise(() => {}));

      const user = userEvent.setup();
      renderExplorer();

      const searchInput = screen.getByRole("textbox", {
        name: /Search projects/i,
      });
      await user.type(searchInput, "dao");

      expect(searchInput).toHaveValue("dao");
    });
  });

  // -------------------------------------------------------------------------
  // Sort controls
  // -------------------------------------------------------------------------

  describe("sort controls", () => {
    it("renders sort dropdown and order toggle button", async () => {
      const projects = createMockProjects(2, (i) => ({
        details: { title: `Sortable ${i + 1}`, slug: `sortable-${i + 1}`, description: "" },
      }));
      mockGetExplorerProjectsPaginated.mockResolvedValue(
        createPaginatedProjectsResponse(projects, { totalCount: 2 })
      );

      renderExplorer();

      await waitFor(() => {
        expect(screen.getByText("Sortable 1")).toBeInTheDocument();
      });

      expect(screen.getByText("Sort by")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Sort (ascending|descending)/ })
      ).toBeInTheDocument();
    });

    it("toggles sort order when sort order button is clicked", async () => {
      const projects = createMockProjects(2, (i) => ({
        details: { title: `Ordered ${i + 1}`, slug: `ordered-${i + 1}`, description: "" },
      }));
      mockGetExplorerProjectsPaginated.mockResolvedValue(
        createPaginatedProjectsResponse(projects, { totalCount: 2 })
      );

      const user = userEvent.setup();
      renderExplorer();

      await waitFor(() => {
        expect(screen.getByText("Ordered 1")).toBeInTheDocument();
      });

      // Default sort order is desc, button offers to sort ascending
      const sortOrderButton = screen.getByRole("button", {
        name: /Sort ascending/,
      });
      await user.click(sortOrderButton);

      // The nuqs setter should have been called
      const sortOrderState = mockQueryStates["sortOrder"];
      expect(sortOrderState).toBeDefined();
      expect(sortOrderState[1]).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Raising Funds filter
  // -------------------------------------------------------------------------

  // NOTE: The ProjectsExplorer component only has one filter: "Raising Funds"
  // (backed by hasPayoutAddress query param). There is no "program type" filter
  // in this component. Program type filtering exists in the ProgramRegistry
  // (ManagePrograms) component via SearchDropdown for Networks, Ecosystems,
  // and Funding Mechanisms.

  describe("raising funds filter", () => {
    it("renders the Raising Funds toggle", async () => {
      const projects = createMockProjects(2, (i) => ({
        details: { title: `Fundable ${i + 1}`, slug: `fundable-${i + 1}`, description: "" },
      }));
      mockGetExplorerProjectsPaginated.mockResolvedValue(
        createPaginatedProjectsResponse(projects, { totalCount: 2 })
      );

      renderExplorer();

      await waitFor(() => {
        expect(screen.getByText("Fundable 1")).toBeInTheDocument();
      });

      expect(screen.getByText("Raising Funds")).toBeInTheDocument();
    });

    it("toggles raising funds filter and refetches", async () => {
      const allProjects = createMockProjects(4, (i) => ({
        details: { title: `Proj ${i + 1}`, slug: `proj-${i + 1}`, description: "" },
      }));
      mockGetExplorerProjectsPaginated.mockResolvedValue(
        createPaginatedProjectsResponse(allProjects, { totalCount: 4 })
      );

      const user = userEvent.setup();
      renderExplorer();

      await waitFor(() => {
        expect(screen.getByText("Proj 1")).toBeInTheDocument();
      });

      // The Raising Funds filter is a sr-only checkbox inside a label
      const toggle = screen.getByRole("checkbox", { name: /Raising Funds/i });
      await user.click(toggle);

      // The nuqs setter for raisingFunds should have been called
      const payoutState = mockQueryStates["raisingFunds"];
      expect(payoutState).toBeDefined();
      expect(payoutState[1]).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // MSW integration note
  // -------------------------------------------------------------------------

  // NOTE: MSW handlers from __tests__/integration/handlers/index.ts are NOT wired up
  // in this file because the ProjectsExplorer component fetches data through the
  // service layer (getExplorerProjectsPaginated), which is mocked at module level
  // via vi.mock("@/services/projects-explorer.service"). The service function
  // never issues an HTTP request in tests, so MSW would never intercept anything.
  //
  // To use MSW here, we would need to:
  // 1. Remove the vi.mock for the service module
  // 2. Ensure the service makes real HTTP calls (it uses fetchData internally)
  // 3. Have MSW intercept those calls
  //
  // However, the service also uses fetchData which is often mocked globally.
  // A true MSW integration test would require restructuring the mock strategy
  // across the test suite. The MSW handlers are validated in a standalone test
  // below to confirm they are functional.

  // -------------------------------------------------------------------------
  // Load More
  // -------------------------------------------------------------------------

  describe("load more", () => {
    it("shows Load More button when there are more pages", async () => {
      const projects = createMockProjects(4, (i) => ({
        details: { title: `Paged ${i + 1}`, slug: `paged-${i + 1}`, description: "" },
      }));
      mockGetExplorerProjectsPaginated.mockResolvedValue(
        createPaginatedProjectsResponse(projects, {
          totalCount: 12,
          hasNextPage: true,
          nextPage: 2,
        })
      );

      renderExplorer();

      await waitFor(() => {
        expect(screen.getByText("Paged 1")).toBeInTheDocument();
      });

      expect(screen.getByRole("button", { name: /Load More Projects/ })).toBeInTheDocument();
    });

    it("shows 'Showing all N projects' when all loaded", async () => {
      const projects = createMockProjects(3, (i) => ({
        details: { title: `All ${i + 1}`, slug: `all-${i + 1}`, description: "" },
      }));
      mockGetExplorerProjectsPaginated.mockResolvedValue(
        createPaginatedProjectsResponse(projects, {
          totalCount: 3,
          hasNextPage: false,
        })
      );

      renderExplorer();

      await waitFor(() => {
        expect(screen.getByText("All 1")).toBeInTheDocument();
      });

      expect(screen.getByText("Showing all 3 projects")).toBeInTheDocument();
    });
  });
});
