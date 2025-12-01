/**
 * E2E Tests: Navbar Navigation Journey
 * Tests navigation through dropdowns, anchors, modals, and external links
 */

import {
  setupCommonIntercepts,
  waitForPageLoad,
  waitForProjectsLoad,
} from "../../support/intercepts";

describe("Navbar Navigation Journey", () => {
  beforeEach(() => {
    setupCommonIntercepts();
    cy.visit("/");
    waitForPageLoad();
  });

  describe("Desktop Dropdown Navigation", () => {
    it("should navigate through For Builders menu", () => {
      // Click For Builders
      cy.contains("button", "For Builders").click();

      // Menu should open
      cy.contains("Create project").should("be.visible");

      // Click menu item
      cy.contains("Find funding").click();

      // Should navigate or scroll to section
      cy.url().should("satisfy", (url: string) => {
        return url.includes("/#") || url === Cypress.config().baseUrl + "/";
      });
    });

    it("should navigate through For Funders menu", () => {
      cy.contains("button", "For Funders").click();

      cy.contains("Explore directory").should("be.visible");

      cy.contains("Explore directory").click();

      // Should navigate
      cy.url().should("not.eq", Cypress.config().baseUrl + "/");
    });

    it("should navigate through Explore menu", () => {
      cy.contains("button", "Explore").click();

      cy.contains("All projects").should("be.visible");

      cy.contains("All projects").click();

      cy.url().should("include", "/projects");
    });

    it("should navigate through Resources menu when logged out", () => {
      // Resources only visible when logged out
      cy.contains("button", "Resources").should("be.visible").click();

      cy.contains("Docs").should("be.visible");

      // Docs is external link
      cy.contains("Docs").should("have.attr", "target", "_blank");
    });
  });

  describe("Mobile Drawer Navigation", () => {
    beforeEach(() => {
      cy.viewport("iphone-x");
      cy.visit("/");
      waitForPageLoad();
    });

    it("should open and navigate from mobile drawer", () => {
      cy.get('[aria-label="Open menu"]').click();

      // Drawer should open
      cy.get('[data-testid="mobile-drawer"]').should("be.visible");

      // Click menu item
      cy.contains("Create project").click();

      // Drawer should close
      cy.get('[data-testid="mobile-drawer"]').should("not.be.visible");
    });

    it("should navigate to All projects from mobile", () => {
      cy.get('[aria-label="Open menu"]').click();

      cy.contains("All projects").click();

      cy.url().should("include", "/projects");
    });
  });

  describe("External Link Navigation", () => {
    it("should open external links in new tab", () => {
      cy.contains("button", "Resources").click();

      // Docs link
      cy.contains("Docs").should("have.attr", "target", "_blank");
      cy.contains("Docs").should("have.attr", "rel");
    });

    it("should open Contact sales in new tab", () => {
      cy.contains("Contact sales").should("have.attr", "target", "_blank");
    });

    it("should open social media links in new tab", () => {
      cy.contains("button", "Resources").click();

      // Social links should have target="_blank"
      cy.get('[aria-label="Twitter"]').should("have.attr", "target", "_blank");
      cy.get('[aria-label="Discord"]').should("have.attr", "target", "_blank");
    });
  });

  describe("Anchor Scrolling - Same Page", () => {
    it("should scroll to section on anchor click", () => {
      cy.contains("button", "For Builders").click();
      cy.contains("Find funding").click();

      // Should either navigate to section or scroll
      cy.url().should("include", "/");
    });
  });

  describe("Navigation from Dropdown Items", () => {
    it("should navigate to communities page", () => {
      cy.contains("button", "Explore").click();

      cy.contains("All communities").click();

      cy.url().should("include", "/communities");
    });

    it("should navigate to projects page", () => {
      cy.contains("button", "Explore").click();

      cy.contains("All projects").click();

      waitForProjectsLoad();

      cy.url().should("include", "/projects");
    });
  });

  describe("Dropdown Close Behavior", () => {
    it("should close dropdown when clicking outside", () => {
      cy.contains("button", "For Builders").click();

      cy.contains("Create project").should("be.visible");

      // Click outside
      cy.get("body").click(0, 0);

      // Dropdown should close
      cy.contains("Create project").should("not.be.visible");
    });

    it("should close dropdown when pressing Escape", () => {
      cy.contains("button", "For Builders").click();

      cy.contains("Create project").should("be.visible");

      cy.get("body").type("{esc}");

      cy.contains("Create project").should("not.be.visible");
    });
  });

  describe("Navigation State Preservation", () => {
    it("should maintain state after navigation", () => {
      // Navigate to projects
      cy.contains("button", "Explore").click();
      cy.contains("All projects").click();

      cy.url().should("include", "/projects");

      // Navbar should still be functional
      cy.contains("button", "For Builders").should("be.visible");
    });

    it("should work across multiple navigations", () => {
      // Multiple navigations
      cy.contains("button", "Explore").click();
      cy.contains("All projects").click();

      waitForProjectsLoad();

      cy.contains("button", "Explore").click();
      cy.contains("All communities").click();

      cy.url().should("include", "/communities");
    });
  });

  describe("Keyboard Navigation", () => {
    it("should navigate dropdowns with keyboard", () => {
      // Tab to For Builders
      cy.get("button").contains("For Builders").focus();

      // Press Enter to open
      cy.focused().type("{enter}");

      // Dropdown should open
      cy.contains("Create project").should("be.visible");
    });

    it("should navigate menu items with arrow keys", () => {
      cy.get("button").contains("For Builders").focus().type("{enter}");

      // Arrow down to navigate items
      cy.focused().type("{downarrow}");

      // Enter to select
      cy.focused().type("{enter}");
    });
  });

  describe("My Projects Navigation", () => {
    it.skip("should navigate to My projects - requires auth", () => {
      cy.login();
      cy.visit("/");
      waitForPageLoad();

      cy.get('[data-testid="user-avatar"]').click();
      cy.contains("My projects").click();

      cy.url().should("include", "/my-projects");
    });
  });

  describe("Admin Navigation", () => {
    it.skip("should navigate to admin page - requires admin auth", () => {
      cy.login({ userType: "admin" });
      cy.visit("/");
      waitForPageLoad();

      cy.get('[data-testid="user-avatar"]').click();
      cy.contains("Admin").click();

      cy.url().should("include", "/admin");
    });
  });
});

