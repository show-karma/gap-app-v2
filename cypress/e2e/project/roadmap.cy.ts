/**
 * E2E Tests: Project Roadmap
 *
 * Tests navigation and basic functionality.
 */

import {
  setupCommonIntercepts,
  waitForPageLoad,
} from "../../support/intercepts";

describe("Project Roadmap Navigation", () => {
  beforeEach(() => {
    setupCommonIntercepts();
  });

  it("should navigate to projects page", () => {
    cy.visit("/projects");
    waitForPageLoad();

    cy.url().should("include", "/projects");
    cy.get("body").should("be.visible");
  });

  it("should have navbar on projects page", () => {
    cy.visit("/projects");
    waitForPageLoad();

    cy.get("nav").should("exist");
  });
});
