/**
 * E2E Tests: Navbar Navigation Journey
 * Tests navigation through dropdowns, anchors, and external links
 */

import {
  setupCommonIntercepts,
  waitForPageLoad,
} from "../../support/intercepts";

describe("Navbar Navigation Journey", () => {
  beforeEach(() => {
    setupCommonIntercepts();
    cy.visit("/");
    waitForPageLoad();
  });

  describe("Desktop Dropdown Navigation", () => {
    it("should open For Builders menu", () => {
      cy.contains("button", "For Builders").click();

      cy.contains("Create project").should("be.visible");
    });

    it("should navigate through For Builders menu", () => {
      cy.contains("button", "For Builders").click();
      cy.contains("Find funding").click();

      // Should navigate or scroll to section
      cy.url().should("include", "/");
    });

    it("should open For Funders menu", () => {
      cy.contains("button", "For Funders").click();

      // For Funders menu should open
      cy.get('[data-state="open"]').should("exist");
    });

    it("should open Explore menu", () => {
      cy.contains("button", "Explore").click();

      cy.contains("All projects").should("be.visible");
    });

    it("should navigate to projects", () => {
      cy.contains("button", "Explore").click();
      cy.contains("All projects").click();

      cy.url().should("include", "/projects");
    });

    it("should open Resources menu", () => {
      cy.contains("button", "Resources").click();

      cy.contains("Docs").should("be.visible");
    });
  });

  describe("External Link Navigation", () => {
    it("should have Docs as external link", () => {
      cy.contains("button", "Resources").click();

      cy.contains("Docs")
        .should("have.attr", "target", "_blank")
        .and("have.attr", "rel");
    });

    it("should have Contact sales as external link", () => {
      cy.contains("Contact sales").should("have.attr", "target", "_blank");
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

      cy.url().should("include", "/projects");
    });
  });

  describe("Dropdown Behavior", () => {
    it("should open and show dropdown content", () => {
      cy.contains("button", "For Builders").click();
      cy.contains("Create project").should("be.visible");
    });
  });

  describe("Navigation State Preservation", () => {
    it("should maintain navbar after navigation", () => {
      cy.contains("button", "Explore").click();
      cy.contains("All projects").click();

      cy.url().should("include", "/projects");

      // Navbar should still be functional
      cy.contains("button", "For Builders").should("be.visible");
    });

    it("should work across multiple navigations", () => {
      // First navigation
      cy.visit("/projects");
      waitForPageLoad();
      cy.url().should("include", "/projects");

      // Second navigation
      cy.visit("/communities");
      waitForPageLoad();
      cy.url().should("include", "/communities");
    });
  });

  describe("Keyboard Navigation", () => {
    it("should open dropdown with keyboard", () => {
      cy.get("button").contains("For Builders").focus();
      cy.focused().type("{enter}");

      cy.contains("Create project").should("be.visible");
    });
  });

  describe("Mobile Drawer Navigation", () => {
    beforeEach(() => {
      cy.viewport("iphone-x");
      cy.visit("/");
      waitForPageLoad();
    });

    it("should open mobile drawer", () => {
      cy.get('[aria-label="Open menu"]').click();

      cy.get('[role="dialog"]').should("be.visible");
    });

    it("should navigate to All projects from mobile", () => {
      cy.get('[aria-label="Open menu"]').click();
      cy.contains("All projects").click();

      cy.url().should("include", "/projects");
    });
  });
});
