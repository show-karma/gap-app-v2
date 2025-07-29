import { EXAMPLE } from "../support/e2e";

describe("Karma Gap Patron", () => {
  it("should be able to see project details", () => {
    cy.visit(`/karma-gap-patron`);
    cy.wait(1000);
    cy.get("label")
      .contains("Enter your Gitcoin project URL")
      .should("be.visible");
    cy.get("#gitcoinProjectUrl")
      .should("be.visible")
      .click({ force: true })
      .type(`${EXAMPLE.GITCOIN_ROUND_URL}`);
    cy.get("#fetch-button").should("be.visible").click({ force: true });
    cy.wait(1000);
    cy.get("h2").contains("Selected Project Details").should("be.visible");
  });
});
