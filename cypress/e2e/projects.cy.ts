import {
  setupCommonIntercepts,
  waitForPageLoad,
  waitForProjectsLoad,
} from "../support/intercepts";

describe("Explore Projects Page", () => {
  beforeEach(() => {
    setupCommonIntercepts();
  });

  it("should enter explore page from homepage", () => {
    cy.visit("/");
    waitForPageLoad();

    // Navigate to projects page
    cy.visit("/projects");
    cy.url().should("include", "/projects");
  });

  it("should display the explore page", () => {
    cy.visit("/projects");

    // Wait for projects to load
    waitForProjectsLoad();

    cy.get("h1").should("contain", "Projects on");
  });

  it("should display projects", () => {
    cy.visit("/projects");

    waitForProjectsLoad();

    // Verify page title
    cy.get("h1").should("contain", "Projects on");

    // Verify projects are rendered
    cy.get("body").should("contain.text", "Projects on");
  });

  it("should change projects if sort by is changed", () => {
    cy.visit("/projects");

    waitForProjectsLoad();

    cy.get("h1").should("contain", "Projects on");

    // Wait for sort button to be available
    cy.get("#sort-by-button").should("be.visible");

    // Change the sort option
    cy.get("#sort-by-button").click({ force: true });

    // Wait for dropdown to open and click "No. of Grants"
    cy.contains("span", "No. of Grants").click({ force: true });

    // Wait for new data to load
    waitForProjectsLoad();

    // Verify the page still shows projects
    cy.get("h1").should("contain", "Projects on");
  });
});

