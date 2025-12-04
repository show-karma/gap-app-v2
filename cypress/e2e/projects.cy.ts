/**
 * E2E Tests: Explore Projects Page
 * Tests the projects listing page
 */

import {
  setupCommonIntercepts,
  waitForPageLoad,
} from "../support/intercepts";

describe("Explore Projects Page", () => {
  beforeEach(() => {
    setupCommonIntercepts();
  });

  describe("Page Navigation", () => {
    it("should navigate to projects page", () => {
      cy.visit("/projects");
      waitForPageLoad();

      cy.url().should("include", "/projects");
    });

    it("should navigate from homepage to projects", () => {
      cy.visit("/");
      waitForPageLoad();

      cy.visit("/projects");
      waitForPageLoad();

      cy.url().should("include", "/projects");
    });
  });

  describe("Page Structure", () => {
    it("should display page content", () => {
      cy.visit("/projects");
      waitForPageLoad();

      cy.get("body").should("be.visible");
    });

    it("should display navbar", () => {
      cy.visit("/projects");
      waitForPageLoad();

      cy.get("nav").should("exist");
    });

    it("should have page heading", () => {
      cy.visit("/projects");
      waitForPageLoad();

      // Page should have some heading
      cy.get("h1, h2").should("exist");
    });
  });

  describe("Navigation Integration", () => {
    it("should navigate to projects via Explore menu", () => {
      cy.visit("/");
      waitForPageLoad();

      cy.contains("button", "Explore").click();
      cy.contains("All projects").click();

      cy.url().should("include", "/projects");
    });

    it("should maintain navbar functionality on projects page", () => {
      cy.visit("/projects");
      waitForPageLoad();

      cy.contains("button", "Explore").should("be.visible");
      cy.contains("button", "For Builders").should("be.visible");
    });
  });
});
