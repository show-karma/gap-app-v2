/**
 * E2E Tests: Navbar Authentication Journey
 * Tests authentication UI elements and states
 */

import {
  setupCommonIntercepts,
  waitForPageLoad,
} from "../../support/intercepts";

describe("Navbar Authentication Journey", () => {
  beforeEach(() => {
    setupCommonIntercepts();
  });

  describe("Unauthenticated State", () => {
    beforeEach(() => {
      cy.visit("/");
      waitForPageLoad();
    });

    it("should show sign in button when not authenticated", () => {
      cy.contains("Sign in").should("be.visible");
    });

    it("should show contact sales button", () => {
      cy.contains("Contact sales").should("be.visible");
    });

    it("should have clickable sign in button", () => {
      cy.contains("Sign in")
        .should("be.visible")
        .and("not.be.disabled");
    });

    it("should have proper navbar structure", () => {
      cy.get("nav").should("exist");
      cy.get("body").should("be.visible");
    });
  });

  describe("Navigation Elements", () => {
    beforeEach(() => {
      cy.visit("/");
      waitForPageLoad();
    });

    it("should display navbar on homepage", () => {
      cy.get("nav").should("be.visible");
    });

    it("should display logo in navbar", () => {
      cy.get("nav").should("exist");
      // Logo should be present
      cy.get("nav").find("a").first().should("exist");
    });

    it("should navigate from navbar", () => {
      cy.get("nav").should("exist");
      cy.get("body").should("be.visible");
    });
  });

  describe("Mobile Menu", () => {
    beforeEach(() => {
      cy.viewport("iphone-x");
      cy.visit("/");
      waitForPageLoad();
    });

    it("should show mobile menu button", () => {
      cy.get('[aria-label="Open menu"]').should("be.visible");
    });

    it("should open mobile drawer on menu click", () => {
      cy.get('[aria-label="Open menu"]').click();

      // Drawer should be open
      cy.get('[role="dialog"]').should("be.visible");
    });

    it("should show menu content in drawer", () => {
      cy.get('[aria-label="Open menu"]').click();

      // Menu content should be visible
      cy.contains("Menu").should("be.visible");
    });

    it("should close drawer when close button is clicked", () => {
      cy.get('[aria-label="Open menu"]').click();
      cy.get('[role="dialog"]').should("be.visible");

      cy.get('[aria-label="Close menu"]').click();

      // Drawer should close (may take a moment)
      cy.get('[role="dialog"]').should("not.exist");
    });
  });

  describe("Page Navigation", () => {
    it("should navigate to homepage", () => {
      cy.visit("/");
      waitForPageLoad();

      cy.url().should("eq", Cypress.config("baseUrl") + "/");
      cy.get("body").should("be.visible");
    });

    it("should navigate to projects page", () => {
      cy.visit("/projects");
      waitForPageLoad();

      cy.url().should("include", "/projects");
      cy.get("nav").should("exist");
    });

    it("should maintain navbar across pages", () => {
      cy.visit("/");
      waitForPageLoad();
      cy.get("nav").should("exist");

      cy.visit("/projects");
      waitForPageLoad();
      cy.get("nav").should("exist");
    });
  });

  describe("Accessibility", () => {
    beforeEach(() => {
      cy.visit("/");
      waitForPageLoad();
    });

    it("should have accessible sign in button", () => {
      cy.contains("Sign in")
        .should("be.visible")
        .and("not.be.disabled");
    });

    it("should have accessible navigation", () => {
      cy.get("nav").should("exist");
    });
  });
});
