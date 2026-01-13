/**
 * E2E Tests: Permission-Based Access
 * Tests navbar elements visibility for unauthenticated users
 */

import {
  setupCommonIntercepts,
  waitForPageLoad,
} from "../../support/intercepts";

describe("Permission-Based Access", () => {
  beforeEach(() => {
    setupCommonIntercepts();
  });

  describe("Unauthenticated User - Desktop", () => {
    beforeEach(() => {
      cy.visit("/");
      waitForPageLoad();
    });

    it("should see Sign in button", () => {
      cy.contains("Sign in").should("be.visible");
    });

    it("should see Contact sales button", () => {
      cy.contains("Contact sales").should("be.visible");
    });

    it("should see Resources menu", () => {
      cy.contains("button", "Resources").should("be.visible");
    });

    it("should have navbar", () => {
      cy.get("nav").should("exist");
    });
  });

  describe("Unauthenticated User - Mobile", () => {
    beforeEach(() => {
      cy.viewport("iphone-x");
      cy.visit("/");
      waitForPageLoad();
    });

    it("should show mobile menu button", () => {
      cy.get('[aria-label="Open menu"]').should("be.visible");
    });

    it("should show sign in button in mobile view", () => {
      // On mobile, the Sign in button should be present
      // It may be in the header or accessible via drawer
      cy.contains("Sign in").should("exist");
    });

    it("should open mobile drawer", () => {
      cy.get('[aria-label="Open menu"]').click();
      cy.get('[role="dialog"]').should("be.visible");
    });
  });

  describe("Public Routes", () => {
    it("should access homepage without auth", () => {
      cy.visit("/");
      waitForPageLoad();

      cy.url().should("eq", Cypress.config("baseUrl") + "/");
      cy.get("body").should("be.visible");
    });

    it("should access projects page without auth", () => {
      cy.visit("/projects");
      waitForPageLoad();

      cy.url().should("include", "/projects");
      cy.get("body").should("be.visible");
    });
  });

  describe("Navigation Consistency", () => {
    it("should maintain navbar across page navigation", () => {
      cy.visit("/");
      waitForPageLoad();
      cy.get("nav").should("exist");

      cy.visit("/projects");
      waitForPageLoad();
      cy.get("nav").should("exist");
    });

    it("should maintain auth buttons across navigation", () => {
      cy.visit("/");
      waitForPageLoad();
      cy.contains("Sign in").should("be.visible");

      cy.visit("/projects");
      waitForPageLoad();
      cy.contains("Sign in").should("be.visible");
    });
  });
});
