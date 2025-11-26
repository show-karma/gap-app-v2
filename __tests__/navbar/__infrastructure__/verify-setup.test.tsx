/**
 * Verification tests for navbar test infrastructure
 * Ensures all fixtures, helpers, and mocks work correctly
 */

import { authFixtures, getAuthFixture } from "../fixtures/auth-fixtures";
import { getResultsByQuery, searchFixtures, searchQueries } from "../fixtures/search-fixtures";
import { scenarioHandlers } from "../mocks/handlers";
import { server } from "../setup";
import { renderWithProviders, screen } from "../utils/test-helpers";

describe("Test Infrastructure Verification", () => {
  describe("Auth Fixtures", () => {
    it("should have all 15 auth fixtures", () => {
      expect(authFixtures).toHaveLength(15);
    });

    it("should get fixture by name", () => {
      const fixture = getAuthFixture("authenticated-basic");
      expect(fixture).toBeDefined();
      expect(fixture.name).toBe("authenticated-basic");
      expect(fixture.authState.authenticated).toBe(true);
    });

    it("should throw error for non-existent fixture", () => {
      expect(() => getAuthFixture("non-existent")).toThrow();
    });

    it("each fixture should have required properties", () => {
      authFixtures.forEach((fixture) => {
        expect(fixture).toHaveProperty("name");
        expect(fixture).toHaveProperty("description");
        expect(fixture).toHaveProperty("authState");
        expect(fixture).toHaveProperty("permissions");
        expect(fixture).toHaveProperty("expectedElements");
      });
    });

    it("auth states should have correct structure", () => {
      authFixtures.forEach((fixture) => {
        expect(fixture.authState).toHaveProperty("ready");
        expect(fixture.authState).toHaveProperty("authenticated");
        expect(fixture.authState).toHaveProperty("isConnected");
      });
    });

    it("permissions should have correct structure", () => {
      authFixtures.forEach((fixture) => {
        expect(fixture.permissions).toHaveProperty("communities");
        expect(fixture.permissions).toHaveProperty("reviewerPrograms");
        expect(fixture.permissions).toHaveProperty("isStaff");
        expect(fixture.permissions).toHaveProperty("isOwner");
        expect(fixture.permissions).toHaveProperty("isPoolManager");
        expect(fixture.permissions).toHaveProperty("isRegistryAdmin");
      });
    });

    it("expected elements should have correct structure", () => {
      authFixtures.forEach((fixture) => {
        expect(fixture.expectedElements).toHaveProperty("signIn");
        expect(fixture.expectedElements).toHaveProperty("contactSales");
        expect(fixture.expectedElements).toHaveProperty("resources");
        expect(fixture.expectedElements).toHaveProperty("userMenu");
        expect(fixture.expectedElements).toHaveProperty("myProjects");
        expect(fixture.expectedElements).toHaveProperty("review");
        expect(fixture.expectedElements).toHaveProperty("admin");
        expect(fixture.expectedElements).toHaveProperty("managePrograms");
      });
    });
  });

  describe("Search Fixtures", () => {
    it("should have empty search results", () => {
      expect(searchFixtures.emptySearchResults).toEqual({
        projects: [],
        communities: [],
      });
    });

    it("should have projects only results", () => {
      expect(searchFixtures.projectsOnlyResults.projects.length).toBeGreaterThan(0);
      expect(searchFixtures.projectsOnlyResults.communities.length).toBe(0);
    });

    it("should have communities only results", () => {
      expect(searchFixtures.communitiesOnlyResults.projects.length).toBe(0);
      expect(searchFixtures.communitiesOnlyResults.communities.length).toBeGreaterThan(0);
    });

    it("should have mixed results", () => {
      expect(searchFixtures.mixedResults.projects.length).toBeGreaterThan(0);
      expect(searchFixtures.mixedResults.communities.length).toBeGreaterThan(0);
    });

    it("should have large result set", () => {
      expect(searchFixtures.largeResultSet.projects.length).toBe(50);
      expect(searchFixtures.largeResultSet.communities.length).toBe(30);
    });

    it("should return results based on query", () => {
      const projectResults = getResultsByQuery("project");
      expect(projectResults.projects.length).toBeGreaterThan(0);

      const communityResults = getResultsByQuery("optimism");
      expect(communityResults.communities.length).toBeGreaterThan(0);

      const emptyResults = getResultsByQuery("nonexistent");
      expect(emptyResults.projects.length).toBe(0);
      expect(emptyResults.communities.length).toBe(0);
    });

    it("should handle short queries correctly", () => {
      const results = getResultsByQuery("pr");
      expect(results.projects.length).toBe(0);
      expect(results.communities.length).toBe(0);
    });

    it("should have search queries defined", () => {
      expect(searchQueries).toHaveProperty("short");
      expect(searchQueries).toHaveProperty("medium");
      expect(searchQueries).toHaveProperty("long");
      expect(searchQueries).toHaveProperty("tooShort1");
      expect(searchQueries).toHaveProperty("empty");
    });

    it("should have search timing constants", () => {
      expect(searchFixtures.searchTiming).toHaveProperty("debounceDelay");
      expect(searchFixtures.searchTiming).toHaveProperty("apiResponseTime");
      expect(searchFixtures.searchTiming).toHaveProperty("networkTimeout");
    });
  });

  describe("MSW Handlers", () => {
    it("server should be defined", () => {
      expect(server).toBeDefined();
    });

    it("should have scenario handlers", () => {
      expect(scenarioHandlers).toHaveProperty("emptySearch");
      expect(scenarioHandlers).toHaveProperty("projectsOnly");
      expect(scenarioHandlers).toHaveProperty("communitiesOnly");
      expect(scenarioHandlers).toHaveProperty("error404");
      expect(scenarioHandlers).toHaveProperty("error500");
      expect(scenarioHandlers).toHaveProperty("timeout");
    });
  });

  describe("Test Helpers", () => {
    it("renderWithProviders should render simple component", () => {
      const TestComponent = () => <div>Test</div>;
      renderWithProviders(<TestComponent />);
      expect(screen.getByText("Test")).toBeInTheDocument();
    });

    it("should render with theme provider", () => {
      const TestComponent = () => <div>Themed Component</div>;
      renderWithProviders(<TestComponent />, { theme: "dark" });
      expect(screen.getByText("Themed Component")).toBeInTheDocument();
    });

    it("should accept auth state and permissions", () => {
      const fixture = getAuthFixture("authenticated-basic");
      const TestComponent = () => <div>Authenticated</div>;

      renderWithProviders(<TestComponent />, {
        authState: fixture.authState,
        permissions: fixture.permissions,
      });

      expect(screen.getByText("Authenticated")).toBeInTheDocument();
    });
  });

  describe("Mock Functions", () => {
    it("should create mock communities", () => {
      const fixture = getAuthFixture("community-admin-single");
      expect(fixture.permissions.communities).toHaveLength(1);
      expect(fixture.permissions.communities[0]).toHaveProperty("uid");
      expect(fixture.permissions.communities[0]).toHaveProperty("details");
    });

    it("should create mock programs", () => {
      const fixture = getAuthFixture("reviewer-single");
      expect(fixture.permissions.reviewerPrograms).toHaveLength(1);
      expect(fixture.permissions.reviewerPrograms[0]).toHaveProperty("uid");
      expect(fixture.permissions.reviewerPrograms[0]).toHaveProperty("metadata");
    });

    it("should create mock projects", () => {
      const project = searchFixtures.createMockProject({
        title: "Custom Project",
      });
      expect(project).toHaveProperty("uid");
      expect(project.title).toBe("Custom Project");
    });

    it("should create mock communities", () => {
      const community = searchFixtures.createMockCommunity({
        name: "Custom Community",
      });
      expect(community).toHaveProperty("uid");
      expect(community.name).toBe("Custom Community");
    });
  });

  describe("Permission Scenarios Coverage", () => {
    it("should have unauthenticated scenario", () => {
      const fixture = getAuthFixture("unauthenticated");
      expect(fixture.authState.authenticated).toBe(false);
      expect(fixture.expectedElements.signIn).toBe(true);
      expect(fixture.expectedElements.userMenu).toBe(false);
    });

    it("should have basic authenticated scenario", () => {
      const fixture = getAuthFixture("authenticated-basic");
      expect(fixture.authState.authenticated).toBe(true);
      expect(fixture.expectedElements.userMenu).toBe(true);
      expect(fixture.expectedElements.admin).toBe(false);
      expect(fixture.expectedElements.review).toBe(false);
    });

    it("should have community admin scenario", () => {
      const fixture = getAuthFixture("community-admin-single");
      expect(fixture.permissions.communities.length).toBeGreaterThan(0);
      expect(fixture.expectedElements.admin).toBe(true);
    });

    it("should have reviewer scenario", () => {
      const fixture = getAuthFixture("reviewer-single");
      expect(fixture.permissions.reviewerPrograms.length).toBeGreaterThan(0);
      expect(fixture.expectedElements.review).toBe(true);
    });

    it("should have staff scenario", () => {
      const fixture = getAuthFixture("staff");
      expect(fixture.permissions.isStaff).toBe(true);
      expect(fixture.expectedElements.admin).toBe(true);
    });

    it("should have owner scenario", () => {
      const fixture = getAuthFixture("owner");
      expect(fixture.permissions.isOwner).toBe(true);
      expect(fixture.expectedElements.admin).toBe(true);
    });

    it("should have pool manager scenario", () => {
      const fixture = getAuthFixture("pool-manager");
      expect(fixture.permissions.isPoolManager).toBe(true);
      expect(fixture.expectedElements.managePrograms).toBe(true);
    });

    it("should have registry admin scenario", () => {
      const fixture = getAuthFixture("registry-admin");
      expect(fixture.permissions.isRegistryAdmin).toBe(true);
      expect(fixture.expectedElements.managePrograms).toBe(true);
    });

    it("should have combined permission scenarios", () => {
      const adminAndReviewer = getAuthFixture("admin-and-reviewer");
      expect(adminAndReviewer.expectedElements.admin).toBe(true);
      expect(adminAndReviewer.expectedElements.review).toBe(true);

      const superUser = getAuthFixture("super-user");
      expect(superUser.expectedElements.admin).toBe(true);
      expect(superUser.expectedElements.review).toBe(true);
      expect(superUser.expectedElements.managePrograms).toBe(true);
    });

    it("should have loading scenario", () => {
      const fixture = getAuthFixture("loading");
      expect(fixture.authState.ready).toBe(false);
      expect(fixture.expectedElements.userMenu).toBe(false);
      expect(fixture.expectedElements.signIn).toBe(false);
    });
  });
});
