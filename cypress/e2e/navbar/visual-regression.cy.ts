/**
 * E2E Tests: Visual Regression
 * Tests visual appearance of navbar components across different states
 *
 * NOTE: These tests are currently SKIPPED until baseline images are established.
 * To enable:
 * 1. Run tests once to generate baseline snapshots
 * 2. Review and commit snapshots to cypress/snapshots/
 * 3. Remove the .skip() from describe blocks
 */

describe.skip("Visual Regression", () => {
  describe("Desktop Navbar Appearance", () => {
    it("should match navbar default state", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.get("nav").should("be.visible");
      cy.matchImageSnapshot("navbar-default");
    });

    it("should match For Builders dropdown", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.contains("button", "For Builders").click();
      cy.contains("Create project").should("be.visible");

      cy.matchImageSnapshot("for-builders-dropdown");
    });

    it("should match For Funders dropdown", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.contains("button", "For Funders").click();
      cy.contains("Explore directory").should("be.visible");

      cy.matchImageSnapshot("for-funders-dropdown");
    });

    it("should match Explore dropdown", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.contains("button", "Explore").click();
      cy.contains("All projects").should("be.visible");

      cy.matchImageSnapshot("explore-dropdown");
    });

    it("should match Resources dropdown", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.contains("button", "Resources").click();
      cy.contains("Docs").should("be.visible");

      cy.matchImageSnapshot("resources-dropdown");
    });
  });

  describe("Search Results Appearance", () => {
    it("should match search results display", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.get('[placeholder*="Search"]').type("test");

      // Wait for search results
      cy.get("body").should("be.visible");

      cy.matchImageSnapshot("search-results");
    });

    it("should match empty search results", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.get('[placeholder*="Search"]').type("zzznonexistent");

      // Wait for empty state
      cy.get("body").should("be.visible");

      cy.matchImageSnapshot("search-no-results");
    });
  });

  describe("Hover States", () => {
    it("should match button hover state", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.contains("button", "For Builders").trigger("mouseover");

      cy.matchImageSnapshot("button-hover");
    });

    it("should match menu item hover", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.contains("button", "For Builders").click();
      cy.contains("Create project").should("be.visible");

      cy.contains("Create project").trigger("mouseover");

      cy.matchImageSnapshot("menu-item-hover");
    });
  });

  describe("Focus States", () => {
    it("should match focused button", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.contains("button", "For Builders").focus();

      cy.matchImageSnapshot("button-focused");
    });

    it("should match focused search input", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.get('[placeholder*="Search"]').focus();

      cy.matchImageSnapshot("search-focused");
    });
  });

  describe("Tablet Appearance", () => {
    it("should match tablet navbar", () => {
      cy.viewport(768, 1024);
      cy.visit("/");

      cy.get("nav").should("be.visible");

      cy.matchImageSnapshot("navbar-tablet");
    });
  });

  describe("Mobile Appearance", () => {
    it("should match mobile navbar", () => {
      cy.viewport(375, 667);
      cy.visit("/");

      cy.get("nav").should("be.visible");

      cy.matchImageSnapshot("navbar-mobile");
    });

    it("should match mobile drawer open", () => {
      cy.viewport(375, 667);
      cy.visit("/");

      cy.get('[aria-label="Open menu"]').click();

      cy.get('[data-testid="mobile-drawer"]').should("be.visible");

      cy.matchImageSnapshot("mobile-drawer-open");
    });
  });

  describe("Theme Variations", () => {
    it.skip("should match dark mode appearance", () => {
      // Skip until dark mode is implemented
      cy.viewport(1440, 900);
      cy.visit("/");

      // Toggle dark mode if available
      // cy.get('[data-testid="theme-toggle"]').click();

      cy.matchImageSnapshot("navbar-dark-mode");
    });
  });
});

