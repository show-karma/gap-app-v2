const community = "gitcoin";
describe("Community Page", () => {
  it("should display the community page", () => {
    cy.visit(`/${community}`);
  });
  it("should display grants", () => {
    cy.visit(`/${community}`);
    cy.get("#grant-card").should("have.length.greaterThan", 0);
  });
  it("should display filter by programs", () => {
    cy.visit(`/${community}`);
    cy.get("#filter-by-programs").should("be.visible");

    // get content of #total-Grants
    cy.get('[id^="total-grants"]').then(($totalGrants) => {
      const totalGrants = $totalGrants.text();
      cy.get('[id^="filter-by-program-"]').first().click({
        force: true,
      });
      cy.wait(2000);
      cy.get('[id^="total-grants"]').then(($newTotalGrant) => {
        const newTotalGrants = $newTotalGrant.text();
        cy.wrap(newTotalGrants).should("not.equal", totalGrants);
      });
    });
  });
  it("should be able to sort by", () => {
    cy.visit(`/${community}`);
    cy.get("#grant-card").should("have.length.greaterThan", 0);

    // Store the initial grants
    cy.get('[id^="grant-card"]').then(($initialCards) => {
      // cy.get("#grant-card").should("have.length.greaterThan", 0);
      const initialTitles = $initialCards
        .map((_, el) => Cypress.$(el).find("#grant-title").first().text())
        .get();

      // Change the sort option
      cy.get("#sort-by-button").click({
        force: true,
      });
      cy.contains("span", "Recent").click({
        force: true,
      });

      cy.wait(2000);
      // Wait for the grants to reload
      cy.get('[id^="grant-card"]').should("have.length.greaterThan", 0);

      // Compare with new grants
      cy.get('[id^="grant-card"]').then(($newCards) => {
        const newTitles = $newCards
          .map((_, el) => Cypress.$(el).find("#grant-title").first().text())
          .get();
        cy.wrap(newTitles).should("not.deep.equal", initialTitles);
      });
    });
  });
  it("should be able to filter by status", () => {
    cy.visit(`/${community}`);
    cy.get("#grant-card").should("have.length.greaterThan", 0);

    // Store the initial grants
    cy.get('[id^="grant-card"]').then(($initialCards) => {
      // cy.get("#grant-card").should("have.length.greaterThan", 0);
      const initialTitles = $initialCards
        .map((_, el) => Cypress.$(el).find("#grant-title").first().text())
        .get();

      // Change the sort option
      cy.get("#status-button").click({
        force: true,
      });
      cy.contains("span", "Starting").click({
        force: true,
      });

      cy.wait(2000);
      // Wait for the grants to reload
      cy.get('[id^="grant-card"]').should("have.length.greaterThan", 0);

      // Compare with new grants
      cy.get('[id^="grant-card"]').then(($newCards) => {
        const newTitles = $newCards
          .map((_, el) => Cypress.$(el).find("#grant-title").first().text())
          .get();
        cy.wrap(newTitles).should("not.deep.equal", initialTitles);
      });
    });
  });
  it("should display feed", () => {
    cy.visit(`/${community}`);
    cy.wait(5000);
    cy.get('[id^="feed-item"]').should("have.length.greaterThan", 0);
  });
});
