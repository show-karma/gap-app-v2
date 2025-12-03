/**
 * E2E Tests: Project Grants
 *
 * Tests navigation to projects page.
 */

import {
  setupCommonIntercepts,
  waitForPageLoad,
} from "../../support/intercepts";

describe("Project Grants Navigation", () => {
  beforeEach(() => {
    setupCommonIntercepts();
  });

  it("should load projects page successfully", () => {
    cy.visit("/projects");
    waitForPageLoad();

    cy.url().should("include", "/projects");
    cy.get("body").should("be.visible");
  });

  it("should display navigation elements", () => {
    cy.visit("/projects");
    waitForPageLoad();

    cy.get("nav").should("exist");
  });

  it("should load page content", () => {
    cy.visit("/projects");
    waitForPageLoad();

    cy.get("body").should("be.visible");
  });
});
