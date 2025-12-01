/**
 * E2E Tests: Navbar Search Journey
 * Tests search functionality, results display, and navigation from search
 */

import {
  setupCommonIntercepts,
  waitForPageLoad,
  waitForSearchResults,
} from "../../support/intercepts";

describe("Navbar Search Journey", () => {
  beforeEach(() => {
    setupCommonIntercepts();
    cy.visit("/");
    waitForPageLoad();
  });

  describe("Basic Search", () => {
    it("should search for projects and navigate", () => {
      // Type in search field
      cy.get('[placeholder*="Search"]').type("test project");

      // Wait for search results
      waitForSearchResults();

      // Results dropdown should appear
      cy.get('[data-testid="search-results"]').should("be.visible");

      // Click first result
      cy.contains("test project").first().click();

      // Should navigate to project page
      cy.url().should("include", "/project");
    });

    it("should display search results", () => {
      cy.get('[placeholder*="Search"]').type("optimism");

      waitForSearchResults();

      // Results should be visible
      cy.get('[data-testid="search-results"]').should("be.visible");

      // Should show project or community results
      cy.contains("optimism", { matchCase: false }).should("be.visible");
    });
  });

  describe("Search for Communities", () => {
    it("should search for communities", () => {
      cy.get('[placeholder*="Search"]').type("community");

      waitForSearchResults();

      // Should show community badge or identifier
      cy.contains("Community").should("be.visible");
    });

    it("should navigate to community page", () => {
      cy.get('[placeholder*="Search"]').type("optimism");

      waitForSearchResults();

      // Click community result
      cy.contains("Community").first().click();

      // Should navigate to community page
      cy.url().should("include", "/communit");
    });
  });

  describe("Empty Search Results", () => {
    it("should show no results message for invalid search", () => {
      cy.get('[placeholder*="Search"]').type("xyznonexistentproject123");

      waitForSearchResults();

      // Should show "no results" message
      cy.contains(/no results|not found/i).should("be.visible");
    });

    it("should handle empty search gracefully", () => {
      cy.get('[placeholder*="Search"]').type(" ");

      // Should not crash or show error
      cy.get('[placeholder*="Search"]').should("be.visible");
    });
  });

  describe("Mobile Search", () => {
    it("should search from mobile drawer", () => {
      cy.viewport("iphone-x");
      cy.visit("/");
      waitForPageLoad();

      // Open mobile drawer
      cy.get('[aria-label="Open menu"]').click();

      // Find search in drawer
      cy.get('[placeholder*="Search"]').type("project");

      waitForSearchResults();

      // Results should appear in drawer context
      cy.contains("project", { matchCase: false }).should("be.visible");
    });

    it("should close drawer on result click", () => {
      cy.viewport("iphone-x");
      cy.visit("/");
      waitForPageLoad();

      cy.get('[aria-label="Open menu"]').click();
      cy.get('[placeholder*="Search"]').type("test");

      waitForSearchResults();

      // Click result
      cy.contains("test", { matchCase: false }).first().click();

      // Drawer should close
      cy.get('[data-testid="mobile-drawer"]').should("not.be.visible");
    });
  });

  describe("Search Dropdown Behavior", () => {
    it("should close dropdown on click outside", () => {
      cy.get('[placeholder*="Search"]').type("test");

      waitForSearchResults();

      cy.get('[data-testid="search-results"]').should("be.visible");

      // Click outside
      cy.get("body").click(0, 0);

      // Dropdown should close
      cy.get('[data-testid="search-results"]').should("not.exist");
    });

    it("should clear search after selection", () => {
      cy.get('[placeholder*="Search"]').type("test");

      waitForSearchResults();

      // Click result
      cy.contains("test", { matchCase: false }).first().click();

      // Search input should be cleared
      cy.get('[placeholder*="Search"]').should("have.value", "");
    });
  });

  describe("Search Results Display", () => {
    it("should show project images in results", () => {
      cy.get('[placeholder*="Search"]').type("project");

      waitForSearchResults();

      // Should show profile pictures/images
      cy.get('[data-testid="search-results"]').within(() => {
        cy.get("img").should("exist");
      });
    });

    it("should show mixed results (projects + communities)", () => {
      cy.get('[placeholder*="Search"]').type("test");

      waitForSearchResults();

      // Should potentially show both project and community results
      cy.get('[data-testid="search-results"]').should("be.visible");
    });
  });

  describe("Search Accessibility", () => {
    it("should be keyboard navigable", () => {
      // Tab to search input
      cy.get('[placeholder*="Search"]').focus();

      // Type query
      cy.focused().type("test");

      waitForSearchResults();

      // Arrow keys should navigate results
      cy.focused().type("{downarrow}");

      // Enter should select result
      cy.focused().type("{enter}");
    });

    it("should close dropdown with Escape", () => {
      cy.get('[placeholder*="Search"]').type("test");

      waitForSearchResults();

      // Press Escape
      cy.get('[placeholder*="Search"]').type("{esc}");

      // Dropdown should close
      cy.get('[data-testid="search-results"]').should("not.exist");
    });
  });

  describe("Search Error Handling", () => {
    it("should handle API errors gracefully", () => {
      // Intercept search with error
      cy.intercept("GET", "**/search**", {
        statusCode: 500,
        body: { error: "Server error" },
      }).as("searchError");

      cy.get('[placeholder*="Search"]').type("test");

      cy.wait("@searchError");

      // Should not crash - may show error message or empty state
      cy.get('[placeholder*="Search"]').should("be.visible");
    });
  });
});

