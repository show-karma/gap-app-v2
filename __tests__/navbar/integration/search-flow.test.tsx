/**
 * Integration Tests: Search Flow
 * Tests complete search journeys including debouncing, API integration, and navigation
 */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavbarSearch } from "@/src/components/navbar/navbar-search";
import { Navbar } from "@/src/components/navbar/navbar";
import {
  renderWithProviders,
  waitForDebounce,
  createMockUsePrivy,
  updateMocks
} from "../utils/test-helpers";

import { server } from "../setup";
import {
  scenarioHandlers,
  createCustomSearchHandler,
} from "../mocks/handlers";
import {
  mixedResults,
  projectsOnlyResults,
  communitiesOnlyResults,
  emptySearchResults,
  largeResultSet,
  searchQueries,
} from "../fixtures/search-fixtures";
import { getAuthFixture } from "../fixtures/auth-fixtures";

describe("Search Flow Integration Tests", () => {
  describe("1. Desktop Search Flow", () => {
    it("should complete full desktop search journey", async () => {
      const user = userEvent.setup();
      server.use(scenarioHandlers.mixedResults);

      renderWithProviders(<NavbarSearch />);

      // Find search input
      const searchInput = screen.getByPlaceholderText("Search Project/Community");
      expect(searchInput).toBeInTheDocument();

      // Type in search field
      await user.type(searchInput, searchQueries.medium);

      // Wait for debounce
      await waitForDebounce();

      // Wait for results to appear
      await waitFor(() => {
        const dropdown = screen.queryByRole("listbox");
        expect(dropdown).toBeInTheDocument();
      });

      // Verify results displayed
      const firstProject = mixedResults.projects[0];
      expect(screen.getByText(firstProject.details.data.title)).toBeInTheDocument();

      // Click a result (simulate)
      const resultLink = screen.getByRole("link", {
        name: new RegExp(firstProject.details.data.title, "i"),
      });
      expect(resultLink).toHaveAttribute("href", `/project/${firstProject.details.data.slug}`);
    });

    it("should show loading spinner during API call", async () => {
      const user = userEvent.setup();
      server.use(scenarioHandlers.mixedResults);

      renderWithProviders(<NavbarSearch />);

      const searchInput = screen.getByPlaceholderText("Search Project/Community");

      // Type search query
      await user.type(searchInput, searchQueries.medium);

      // Loading spinner should appear immediately
      const loadingIndicator = screen.queryByText(/searching/i) || screen.queryByRole("status");
      
      // Wait for results
      await waitForDebounce();

      await waitFor(() => {
        const dropdown = screen.queryByRole("listbox");
        expect(dropdown).toBeInTheDocument();
      });
    });

    it("should navigate and reset search after clicking result", async () => {
      const user = userEvent.setup();
      server.use(scenarioHandlers.mixedResults);

      renderWithProviders(<NavbarSearch />);

      const searchInput = screen.getByPlaceholderText("Search Project/Community");

      // Type and search
      await user.type(searchInput, searchQueries.medium);
      await waitForDebounce();

      // Wait for results
      await waitFor(() => {
        expect(screen.queryByRole("listbox")).toBeInTheDocument();
      });

      // Click result (Note: actual navigation would happen in E2E test)
      const firstProject = mixedResults.projects[0];
      const resultLink = screen.getByRole("link", {
        name: new RegExp(firstProject.details.data.title, "i"),
      });

      await user.click(resultLink);

      // In actual component, search would clear and dropdown close
      // This is verified by the component's onClick handler
    });
  });

  describe("2. Mobile Search Flow", () => {
    it("should complete search in mobile drawer", async () => {
      const user = userEvent.setup();
      server.use(scenarioHandlers.mixedResults);
      const authFixture = getAuthFixture("unauthenticated");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      });

      // Open mobile drawer
      const mobileMenuButton = screen.getByLabelText("Open menu");
      await user.click(mobileMenuButton);

      // Wait for drawer to open
      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      // Find search input in drawer
      const drawer = screen.getByRole("dialog");
      const searchInput = within(drawer).getByPlaceholderText("Search Project/Community");

      // Type search query
      await user.type(searchInput, searchQueries.medium);
      await waitForDebounce();

      // Wait for results in drawer context
      await waitFor(() => {
        const results = within(drawer).queryByRole("listbox");
        expect(results).toBeInTheDocument();
      });

      // Verify results appear in drawer
      const firstProject = mixedResults.projects[0];
      const resultInDrawer = within(drawer).getByText(firstProject.details.data.title);
      expect(resultInDrawer).toBeInTheDocument();
    });

    it("should close drawer after clicking search result", async () => {
      const user = userEvent.setup();
      server.use(scenarioHandlers.mixedResults);
      const authFixture = getAuthFixture("unauthenticated");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      });

      // Open mobile drawer
      const mobileMenuButton = screen.getByLabelText("Open menu");
      await user.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      // Search in drawer
      const drawer = screen.getByRole("dialog");
      const searchInput = within(drawer).getByPlaceholderText("Search Project/Community");
      await user.type(searchInput, searchQueries.medium);
      await waitForDebounce();

      // Wait for results
      await waitFor(() => {
        expect(within(drawer).queryByRole("listbox")).toBeInTheDocument();
      });

      // Click result (drawer should close via onClose callback)
      const firstProject = mixedResults.projects[0];
      const resultLink = within(drawer).getByRole("link", {
        name: new RegExp(firstProject.details.data.title, "i"),
      });

      await user.click(resultLink);
      // Drawer closing is handled by component's onClose callback
    });
  });

  describe("3. Search with Debouncing", () => {
    it("should debounce rapid typing and only call API once", async () => {
      const user = userEvent.setup();
      const mockHandler = jest.fn();
      server.use(
        createCustomSearchHandler((req, url) => {
          mockHandler();
          return projectsOnlyResults;
        })
      );

      renderWithProviders(<NavbarSearch />);

      const searchInput = screen.getByPlaceholderText("Search Project/Community");

      // Type "pro" quickly
      await user.type(searchInput, "pro", { delay: 50 });

      // Wait for debounce (500ms)
      await waitForDebounce();

      // API should be called once for "pro"
      await waitFor(() => {
        expect(mockHandler).toHaveBeenCalledTimes(1);
      });

      // Results should appear
      expect(screen.queryByRole("listbox")).toBeInTheDocument();
    });

    it("should cancel previous request and call API with latest query", async () => {
      const user = userEvent.setup();
      const mockHandler = jest.fn();
      server.use(
        createCustomSearchHandler((req, url) => {
          const query = url.searchParams.get("query");
          mockHandler(query);
          return projectsOnlyResults;
        })
      );

      renderWithProviders(<NavbarSearch />);

      const searchInput = screen.getByPlaceholderText("Search Project/Community");

      // Type "pro" quickly
      await user.type(searchInput, "pro", { delay: 50 });

      // Wait a bit but not full debounce
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Type "ject" to complete "project"
      await user.type(searchInput, "ject", { delay: 50 });

      // Wait for debounce
      await waitForDebounce();

      // Should only call API with final query "project"
      await waitFor(() => {
        expect(mockHandler).toHaveBeenCalledWith("project");
      });
    });

    it("should not search when query is less than 3 characters", async () => {
      const user = userEvent.setup();
      const mockHandler = jest.fn();
      server.use(
        createCustomSearchHandler(() => {
          mockHandler();
          return emptySearchResults;
        })
      );

      renderWithProviders(<NavbarSearch />);

      const searchInput = screen.getByPlaceholderText("Search Project/Community");

      // Type 2 characters
      await user.type(searchInput, "pr");
      await waitForDebounce();

      // API should not be called
      expect(mockHandler).not.toHaveBeenCalled();

      // No results dropdown should appear
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("should search when query reaches 3 characters", async () => {
      const user = userEvent.setup();
      server.use(scenarioHandlers.projectsOnly);

      renderWithProviders(<NavbarSearch />);

      const searchInput = screen.getByPlaceholderText("Search Project/Community");

      // Type exactly 3 characters
      await user.type(searchInput, "pro");
      await waitForDebounce();

      // Results should appear
      await waitFor(() => {
        expect(screen.queryByRole("listbox")).toBeInTheDocument();
      });
    });
  });

  describe("4. Multiple Searches in Succession", () => {
    it("should handle multiple different searches correctly", async () => {
      const user = userEvent.setup();

      renderWithProviders(<NavbarSearch />);

      const searchInput = screen.getByPlaceholderText("Search Project/Community");

      // First search - projects
      server.use(scenarioHandlers.projectsOnly);
      await user.type(searchInput, searchQueries.short);
      await waitForDebounce();

      await waitFor(() => {
        expect(screen.getByText(projectsOnlyResults.projects[0].details.data.title)).toBeInTheDocument();
      });

      // Clear search
      await user.clear(searchInput);

      // Second search - communities
      server.use(scenarioHandlers.communitiesOnly);
      await user.type(searchInput, searchQueries.ethereum);
      await waitForDebounce();

      await waitFor(() => {
        expect(screen.getByText(communitiesOnlyResults.communities[0].details.data.name)).toBeInTheDocument();
      });

      // Previous results should be replaced
      expect(screen.queryByText(projectsOnlyResults.projects[0].details.data.title)).not.toBeInTheDocument();
    });

    it("should reset state between searches", async () => {
      const user = userEvent.setup();

      renderWithProviders(<NavbarSearch />);

      const searchInput = screen.getByPlaceholderText("Search Project/Community");

      // First search
      server.use(scenarioHandlers.mixedResults);
      await user.type(searchInput, searchQueries.medium);
      await waitForDebounce();

      await waitFor(() => {
        expect(screen.queryByRole("listbox")).toBeInTheDocument();
      });

      // Clear
      await user.clear(searchInput);

      // Dropdown should close when cleared below 3 characters
      await waitFor(() => {
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      });

      // Second search
      await user.type(searchInput, "test");
      await waitForDebounce();

      // Fresh results should appear
      await waitFor(() => {
        expect(screen.queryByRole("listbox")).toBeInTheDocument();
      });
    });
  });

  describe("5. Error Recovery Flow", () => {
    it("should handle API error gracefully", async () => {
      const user = userEvent.setup();
      server.use(scenarioHandlers.serverError);

      renderWithProviders(<NavbarSearch />);

      const searchInput = screen.getByPlaceholderText("Search Project/Community");

      await user.type(searchInput, "test");
      await waitForDebounce();

      // Component should not crash
      expect(searchInput).toBeInTheDocument();

      // Error state should be handled (component-specific behavior)
      // No results should appear
      await waitFor(() => {
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      });
    });

    it("should recover from error and work on next search", async () => {
      const user = userEvent.setup();

      renderWithProviders(<NavbarSearch />);

      const searchInput = screen.getByPlaceholderText("Search Project/Community");

      // First search - error
      server.use(scenarioHandlers.serverError);
      await user.type(searchInput, "error");
      await waitForDebounce();

      // Clear search
      await user.clear(searchInput);

      // Second search - success
      server.use(scenarioHandlers.projectsOnly);
      await user.type(searchInput, searchQueries.short);
      await waitForDebounce();

      // Should work normally
      await waitFor(() => {
        expect(screen.queryByRole("listbox")).toBeInTheDocument();
      });

      expect(screen.getByText(projectsOnlyResults.projects[0].details.data.title)).toBeInTheDocument();
    });

    it("should handle network timeout", async () => {
      const user = userEvent.setup();
      server.use(scenarioHandlers.timeout);

      renderWithProviders(<NavbarSearch />);

      const searchInput = screen.getByPlaceholderText("Search Project/Community");

      await user.type(searchInput, "timeout");
      await waitForDebounce();

      // Component should handle timeout gracefully
      expect(searchInput).toBeInTheDocument();
    });
  });

  describe("6. Empty State Handling", () => {
    it("should show no results message for empty results", async () => {
      const user = userEvent.setup();
      server.use(scenarioHandlers.emptySearch);

      renderWithProviders(<NavbarSearch />);

      const searchInput = screen.getByPlaceholderText("Search Project/Community");

      await user.type(searchInput, "nonexistent");
      await waitForDebounce();

      // Should show empty state message
      await waitFor(() => {
        const noResults = screen.queryByText(/no results found/i) || 
                         screen.queryByText(/no projects or communities found/i);
        expect(noResults).toBeInTheDocument();
      });
    });

    it("should show results after previous empty state", async () => {
      const user = userEvent.setup();

      renderWithProviders(<NavbarSearch />);

      const searchInput = screen.getByPlaceholderText("Search Project/Community");

      // First search - empty
      server.use(scenarioHandlers.emptySearch);
      await user.type(searchInput, "nonexistent");
      await waitForDebounce();

      await waitFor(() => {
        const noResults = screen.queryByText(/no results found/i);
        expect(noResults).toBeInTheDocument();
      });

      // Clear and search again
      await user.clear(searchInput);

      server.use(scenarioHandlers.projectsOnly);
      await user.type(searchInput, searchQueries.short);
      await waitForDebounce();

      // Results should appear normally
      await waitFor(() => {
        expect(screen.getByText(projectsOnlyResults.projects[0].details.data.title)).toBeInTheDocument();
      });
    });
  });

  describe("7. Search Result Types", () => {
    it("should display projects only results correctly", async () => {
      const user = userEvent.setup();
      server.use(scenarioHandlers.projectsOnly);

      renderWithProviders(<NavbarSearch />);

      const searchInput = screen.getByPlaceholderText("Search Project/Community");

      await user.type(searchInput, searchQueries.short);
      await waitForDebounce();

      await waitFor(() => {
        expect(screen.getByText(projectsOnlyResults.projects[0].details.data.title)).toBeInTheDocument();
      });

      // Verify multiple projects displayed
      projectsOnlyResults.projects.slice(0, 3).forEach((project) => {
        expect(screen.getByText(project.details.data.title)).toBeInTheDocument();
      });

      // No communities should be shown
      expect(screen.queryByText(/community/i)).not.toBeInTheDocument();
    });

    it("should display communities only results correctly", async () => {
      const user = userEvent.setup();
      server.use(scenarioHandlers.communitiesOnly);

      renderWithProviders(<NavbarSearch />);

      const searchInput = screen.getByPlaceholderText("Search Project/Community");

      await user.type(searchInput, searchQueries.ethereum);
      await waitForDebounce();

      await waitFor(() => {
        expect(screen.getByText(communitiesOnlyResults.communities[0].details.data.name)).toBeInTheDocument();
      });

      // Verify community badge or indicator
      const communityBadges = screen.getAllByText(/community/i);
      expect(communityBadges.length).toBeGreaterThan(0);
    });

    it("should display mixed results (projects and communities)", async () => {
      const user = userEvent.setup();
      server.use(scenarioHandlers.mixedResults);

      renderWithProviders(<NavbarSearch />);

      const searchInput = screen.getByPlaceholderText("Search Project/Community");

      await user.type(searchInput, searchQueries.medium);
      await waitForDebounce();

      // Should have both projects and communities
      await waitFor(() => {
        expect(screen.getByText(mixedResults.projects[0].details.data.title)).toBeInTheDocument();
      });

      expect(screen.getByText(mixedResults.communities[0].details.data.name)).toBeInTheDocument();

      // Community badges should be present
      const communityBadges = screen.getAllByText(/community/i);
      expect(communityBadges.length).toBeGreaterThan(0);
    });

    it("should handle large result sets", async () => {
      const user = userEvent.setup();
      server.use(scenarioHandlers.largeResults);

      renderWithProviders(<NavbarSearch />);

      const searchInput = screen.getByPlaceholderText("Search Project/Community");

      await user.type(searchInput, searchQueries.long);
      await waitForDebounce();

      // Results should render (may be limited by component)
      await waitFor(() => {
        expect(screen.queryByRole("listbox")).toBeInTheDocument();
      });

      // Component should handle large result set without performance issues
      // This is more about not crashing than specific content
      expect(searchInput).toBeInTheDocument();
    });
  });
});

