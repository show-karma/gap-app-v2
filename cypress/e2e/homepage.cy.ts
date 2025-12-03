import { setupCommonIntercepts, waitForPageLoad } from "../support/intercepts";

describe("Homepage", () => {
  beforeEach(() => {
    setupCommonIntercepts();
  });

  it("should load and display key elements", () => {
    cy.visit("/");

    // Wait for page to fully load
    waitForPageLoad();

    // Check if the navbar is present
    cy.get("nav").should("exist");

    // Check if the main content area exists
    cy.get("main").should("exist");

    // Check if the footer is present
    cy.get("footer").should("exist");
  });

  it("should display Sign in button", () => {
    cy.visit("/");

    waitForPageLoad();

    cy.get("button")
      .contains(/sign in/i)
      .should("exist");
  });

  it("should display navigation menu items", () => {
    cy.visit("/");

    waitForPageLoad();

    // Check for main navigation items
    cy.contains("button", "For Builders").should("be.visible");
    cy.contains("button", "For Funders").should("be.visible");
    cy.contains("button", "Explore").should("be.visible");
  });
});

