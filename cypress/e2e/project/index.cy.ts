/**
 * E2E Tests: Project Page
 *
 * Tests project page navigation.
 */

import { EXAMPLE } from "../../support/e2e";
import {
  setupCommonIntercepts,
  waitForPageLoad,
} from "../../support/intercepts";

describe("Project Page Navigation", () => {
  beforeEach(() => {
    setupCommonIntercepts();
  });

  describe("Projects Page", () => {
    it("should load projects page", () => {
      cy.visit("/projects");
      waitForPageLoad();

      cy.url().should("include", "/projects");
      cy.get("body").should("be.visible");
    });

    it("should display navigation on projects page", () => {
      cy.visit("/projects");
      waitForPageLoad();

      cy.get("nav").should("exist");
    });
  });

  describe("Page Navigation", () => {
    it("should navigate from homepage to projects", () => {
      cy.visit("/");
      waitForPageLoad();

      cy.visit("/projects");
      waitForPageLoad();

      cy.url().should("include", "/projects");
    });

    it("should have proper page structure on homepage", () => {
      cy.visit("/");
      waitForPageLoad();

      cy.get("nav").should("exist");
      cy.get("body").should("be.visible");
    });

    it("should handle navigation between pages", () => {
      cy.visit("/");
      waitForPageLoad();

      cy.visit("/projects");
      waitForPageLoad();

      cy.url().should("include", "/projects");

      cy.visit("/");
      waitForPageLoad();

      cy.url().should("not.include", "/projects");
    });
  });
});
