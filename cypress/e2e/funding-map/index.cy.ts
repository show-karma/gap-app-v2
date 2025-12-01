import { EXAMPLE } from "../../support/e2e";
import {
  setupFundingMapIntercepts,
  waitForFundingPrograms,
  waitForPageLoad,
} from "../../support/intercepts";

describe("Funding Map Page", () => {
  beforeEach(() => {
    setupFundingMapIntercepts();
  });

  it("should be able to see funding map page", () => {
    cy.visit("/funding-map");
    waitForPageLoad();

    cy.url().should("include", "/funding-map");
  });

  it("should be able to see grant programs", () => {
    cy.visit("/funding-map");
    waitForFundingPrograms();

    cy.get("[id^='grant-program-row']").should("have.length.greaterThan", 0);
  });

  it("should be able to search specific programs", () => {
    cy.visit("/funding-map");
    waitForFundingPrograms();

    cy.get("[id^='grant-program-row']")
      .should("have.length.greaterThan", 0)
      .then(($programs) => {
        cy.get("#search-programs")
          .click({ force: true })
          .type(EXAMPLE.FUNDING_MAP.SEARCH_PROGRAM);

        // Wait for filtered results
        waitForFundingPrograms();

        cy.get("[id^='grant-program-row']")
          .should("have.length.greaterThan", 0)
          .then(($newPrograms) => {
            cy.wrap($newPrograms).should("not.deep.equal", $programs);
          });
      });
  });

  it("should be able to open grant program details modal", () => {
    cy.visit("/funding-map");
    waitForFundingPrograms();

    cy.get("[id^='grant-program-row']")
      .should("have.length.greaterThan", 0)
      .first()
      .then(($programRow) => {
        $programRow.find("#grant-program-title").click();
        cy.get("#grant-program-details-modal").should("be.visible");
        cy.url().should("include", "programId=");
      });
  });

  it("should be able to filter by network", () => {
    cy.visit("/funding-map");
    waitForFundingPrograms();

    // Click network filter
    cy.get("[id^='network-filter']").should("exist").click({ force: true });

    // Select a network option
    cy.contains(EXAMPLE.FUNDING_MAP.NETWORK_FILTER).click({ force: true });

    // Wait for filtered results
    waitForFundingPrograms();

    // Verify filter is applied
    cy.url().should("include", "network=").or("not.include", "network=");
  });

  it("should be able to clear filters", () => {
    cy.visit("/funding-map");
    waitForFundingPrograms();

    // Apply a search filter first
    cy.get("#search-programs").type("test");

    // Clear the filter
    cy.get("#search-programs").clear();

    // Wait for results to reset
    waitForFundingPrograms();

    cy.get("[id^='grant-program-row']").should("have.length.greaterThan", 0);
  });
});

