import { EXAMPLE } from "../../support/e2e";
import {
  setupCommonIntercepts,
  waitForGrants,
  waitForProjectLoad,
} from "../../support/intercepts";

describe("Normal User - Project Grants", () => {
  beforeEach(() => {
    setupCommonIntercepts();
  });

  it("should be able to see grants", () => {
    cy.visit(`/project/${EXAMPLE.PROJECT}/funding`);
    waitForGrants();

    cy.get("[id^='project-grant']").should("have.length.greaterThan", 0);
  });

  it("should be able to navigate between grants", () => {
    cy.visit(`/project/${EXAMPLE.PROJECT}/funding`);
    waitForGrants();

    cy.get("[id^='project-grant']").last().click({ force: true });
    cy.url().should("include", "/funding/0x");

    cy.get("[id^='project-grant']").first().click({ force: true });
    cy.url().should("include", "/funding/0x");
  });

  it("should be able to navigate between tabs", () => {
    cy.visit(`/project/${EXAMPLE.PROJECT}/funding`);
    waitForGrants();

    cy.get("[id^='project-grant']").last().click({ force: true });
    cy.url().should("include", "/funding/0x");

    // Navigate to milestones and updates
    cy.get("#tab-milestones-and-updates").click({ force: true });
    cy.get("#milestones-and-updates-list").should("be.visible");
    cy.url().should("include", "/milestones-and-updates");

    // Navigate to impact criteria
    cy.get("#tab-impact-criteria").click({ force: true });
    cy.url().should("include", "/impact-criteria");

    // Navigate back to overview
    cy.get("#tab-overview").click({ force: true });
    cy.url().should("include", "/funding/0x");
  });
});

