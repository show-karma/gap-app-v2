import { EXAMPLE } from "../../support/e2e";

describe("Funding Map Page", () => {
  it("should be able to see funding map page", () => {
    cy.visit("/funding-map");
  });
  it("should be able to see grant programs", () => {
    cy.visit("/funding-map");
    cy.wait(1000);
    cy.get("[id^='grant-program-row']").should("have.length.greaterThan", 0);
  });
  it("should be able to search specific programs", () => {
    cy.visit("/funding-map");
    cy.wait(1000);
    cy.get("[id^='grant-program-row']")
      .should("have.length.greaterThan", 0)
      .then(($programs) => {
        cy.get("#search-programs")
          .click({ force: true })
          .type(EXAMPLE.FUNDING_MAP.SEARCH_PROGRAM);
        cy.wait(1000);

        cy.get("[id^='grant-program-row']")
          .should("have.length.greaterThan", 0)
          .then(($newPrograms) => {
            cy.wrap($newPrograms).should("not.deep.equal", $programs);
          });
      });
  });
  it("should be able to open grant program details modal", () => {
    cy.visit("/funding-map");
    cy.wait(1000);
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
    cy.wait(1000);
    cy.get("[id^='grant-program-row']")
      .should("have.length.greaterThan", 0)
      .then(($programRows) => {
        const dropdownId = "networks-dropdown";
        cy.get(`#${dropdownId}`).click({ force: true });
        cy.get(`[name="${dropdownId}-search"]`)
          .click({ force: true })
          .type(EXAMPLE.FUNDING_MAP.SEARCH_NETWORK);
        cy.get(`[id="${EXAMPLE.FUNDING_MAP.SEARCH_NETWORK}-item"]`).click({
          force: true,
        });
        cy.get("[id^='grant-program-row']")
          .should("have.length.greaterThan", 0)
          .then(($newPrograms) => {
            cy.wrap($newPrograms).should("not.deep.equal", $programRows);
          });
      });
  });
  it("should be able to filter by ecosystems", () => {
    cy.visit("/funding-map");
    cy.wait(1000);
    cy.get("[id^='grant-program-row']")
      .should("have.length.greaterThan", 0)
      .then(($programRows) => {
        const dropdownId = "ecosystems-dropdown";
        cy.get(`#${dropdownId}`).click({ force: true });
        cy.get(`[name="${dropdownId}-search"]`)
          .click({ force: true })
          .type(EXAMPLE.FUNDING_MAP.SEARCH_ECOSYSTEM);
        cy.get(`[id="${EXAMPLE.FUNDING_MAP.SEARCH_ECOSYSTEM}-item"]`).click({
          force: true,
        });
        cy.get("[id^='grant-program-row']").then(($newPrograms) => {
          cy.wrap($newPrograms).should("not.deep.equal", $programRows);
        });
      });
  });
  it("should be able to filter by funding mechanisms", () => {
    cy.visit("/funding-map");
    cy.wait(1000);
    cy.get("[id^='grant-program-row']")
      .should("have.length.greaterThan", 0)
      .then(($programRows) => {
        const dropdownId = "funding-mechanisms-dropdown";
        cy.get(`#${dropdownId}`).click({ force: true });
        cy.get(`[name="${dropdownId}-search"]`)
          .click({ force: true })
          .type(EXAMPLE.FUNDING_MAP.SEARCH_FUNDING);
        cy.get(`[id="${EXAMPLE.FUNDING_MAP.SEARCH_FUNDING}-item"]`).click({
          force: true,
        });
        cy.get("[id^='grant-program-row']").then(($newPrograms) => {
          cy.wrap($newPrograms).should("not.deep.equal", $programRows);
        });
      });
  });
  it("should be able to filter by status", () => {
    cy.visit("/funding-map");
    cy.wait(1000);
    cy.get("[id^='grant-program-row']")
      .should("have.length.greaterThan", 0)
      .then(($programRows) => {
        cy.get(`#status-all`).click({ force: true });
        cy.get("[id^='grant-program-row']").then(($newPrograms) => {
          cy.wrap($newPrograms).should("not.deep.equal", $programRows);
        });
      });
  });
});
