/**
 * E2E Tests: Mobile Navigation
 * Tests mobile-specific navigation including drawer and hamburger menu
 */

import {
  setupCommonIntercepts,
  waitForPageLoad,
} from "../../support/intercepts";

describe("Mobile Navigation", () => {
  beforeEach(() => {
    setupCommonIntercepts();
    cy.viewport("iphone-x");
    cy.visit("/");
    waitForPageLoad();
  });

  describe("Mobile Drawer", () => {
    it("should open mobile drawer", () => {
      cy.get('[aria-label="Open menu"]').click();

      // Drawer should be visible (uses role="dialog")
      cy.get('[role="dialog"]').should("be.visible");
    });

    it("should close mobile drawer on close button", () => {
      cy.get('[aria-label="Open menu"]').click();
      cy.get('[role="dialog"]').should("be.visible");

      cy.get('[aria-label="Close menu"]').click();

      // Drawer should close
      cy.get('[role="dialog"]').should("not.exist");
    });

    it("should show menu title in drawer", () => {
      cy.get('[aria-label="Open menu"]').click();

      cy.contains("Menu").should("be.visible");
    });
  });

  describe("Mobile Menu - Unauthenticated", () => {
    it("should show Sign in button in mobile header", () => {
      cy.contains("Sign in").should("be.visible");
    });

    it("should show Contact sales in mobile header", () => {
      // Contact sales link should exist in the header
      // Note: On mobile, it may be rendered but visually positioned differently
      cy.contains("a", "Contact sales").should("exist");
    });

    it("should show drawer content", () => {
      cy.get('[aria-label="Open menu"]').click();

      // Drawer should have content
      cy.get('[role="dialog"]').should("be.visible");
      cy.contains("Menu").should("be.visible");
    });

    it("should show navigation items in drawer", () => {
      cy.get('[aria-label="Open menu"]').click();

      // Navigation items should exist in drawer
      cy.contains("All projects").should("exist");
    });
  });

  describe("Mobile Navigation Items", () => {
    it("should navigate to projects from drawer", () => {
      cy.get('[aria-label="Open menu"]').click();

      cy.contains("All projects").click();

      cy.url().should("include", "/projects");
    });

    it("should navigate to communities from drawer", () => {
      cy.get('[aria-label="Open menu"]').click();

      cy.contains("All communities").click({ force: true });

      cy.url().should("include", "/communities");
    });
  });

  describe("Mobile Search", () => {
    it("should have search in mobile drawer", () => {
      cy.get('[aria-label="Open menu"]').click();

      // Search input should be present in drawer
      cy.get('[role="dialog"]').within(() => {
        cy.get('input[placeholder*="Search"]').should("be.visible");
      });
    });

    it("should allow typing in search", () => {
      cy.get('[aria-label="Open menu"]').click();

      cy.get('[role="dialog"]').within(() => {
        cy.get('input[placeholder*="Search"]').type("test");
        cy.get('input[placeholder*="Search"]').should("have.value", "test");
      });
    });
  });

  describe("Mobile Responsive Breakpoints", () => {
    it("should show hamburger menu on small screens", () => {
      cy.viewport(375, 667);
      cy.visit("/");
      waitForPageLoad();

      cy.get('[aria-label="Open menu"]').should("be.visible");
    });

    it("should show hamburger menu on tablet", () => {
      cy.viewport(768, 1024);
      cy.visit("/");
      waitForPageLoad();

      cy.get('[aria-label="Open menu"]').should("exist");
    });

    it("should hide hamburger menu on desktop", () => {
      cy.viewport(1440, 900);
      cy.visit("/");
      waitForPageLoad();

      cy.get('[aria-label="Open menu"]').should("not.be.visible");
    });
  });

  describe("Mobile Accessibility", () => {
    it("should have accessible menu button", () => {
      cy.get('[aria-label="Open menu"]')
        .should("be.visible")
        .and("not.be.disabled");
    });
  });

  describe("Mobile Page Navigation", () => {
    it("should navigate from drawer", () => {
      cy.get('[aria-label="Open menu"]').click();
      cy.get('[role="dialog"]').should("be.visible");

      cy.contains("All projects").click();

      // Should navigate
      cy.url().should("include", "/projects");
    });
  });
});
