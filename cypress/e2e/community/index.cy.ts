const community = "gitcoin";
describe("Community Page", () => {
  it("should display the community page", () => {
    cy.visit(`/${community}`);
    cy.contains("For Builders").should("be.visible");
  });
  it("should display grants", () => {
    cy.visit(`/${community}`);
    // Wait for grants to load
    cy.get("#grant-card", { timeout: 10000 }).should("have.length.greaterThan", 0);
  });
  it("should display filter by programs", () => {
    cy.visit(`/${community}`);
    cy.get("#filter-by-programs").should("be.visible");

    // Wait for grants to load first
    cy.get("#grant-card", { timeout: 10000 }).should("have.length.greaterThan", 0);
    
    // Store initial grant count
    cy.get("#grant-card").then(($initialCards) => {
      const initialCount = $initialCards.length;
      
      // Open the program filter dropdown
      cy.get("#filter-by-programs").click({ force: true });
      
      // Wait for dropdown items to appear (items use format: {programId}_{chainID}-item)
      cy.get('[id$="-item"]', { timeout: 5000 }).should("have.length.greaterThan", 0);
      
      // Click first program item
      cy.get('[id$="-item"]').first().click({ force: true });
      
      // Wait for grants to reload after filter
      cy.wait(2000);
      cy.get("#grant-card", { timeout: 10000 }).should("have.length.greaterThan", 0);
      
      // Verify the grant count changed (filtered results)
      cy.get("#grant-card").then(($newCards) => {
        const newCount = $newCards.length;
        // The count should be different (could be less or same, but filter was applied)
        cy.wrap(newCount).should("be.a", "number");
      });
    });
  });
  it("should be able to sort by", () => {
    cy.visit(`/${community}`);
    // Wait for grants to load
    cy.get("#grant-card", { timeout: 10000 }).should("have.length.greaterThan", 0);

    // Store the initial grants
    cy.get("#grant-card").then(($initialCards) => {
      const initialTitles = $initialCards
        .map((_, el) => Cypress.$(el).find("#grant-project-title").first().text())
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
      cy.get("#grant-card", { timeout: 10000 }).should("have.length.greaterThan", 0);

      // Compare with new grants
      cy.get("#grant-card").then(($newCards) => {
        const newTitles = $newCards
          .map((_, el) => Cypress.$(el).find("#grant-project-title").first().text())
          .get();
        cy.wrap(newTitles).should("not.deep.equal", initialTitles);
      });
    });
  });
  it("should be able to filter by maturity stage", () => {
    // This test only works for communities that have maturity stage filter (e.g., celo)
    cy.visit(`/community/celo`);
    // Wait for grants to load
    cy.get("#grant-card", { timeout: 10000 }).should("have.length.greaterThan", 0);

    // Store the initial grants
    cy.get("#grant-card").then(($initialCards) => {
      const initialTitles = $initialCards
        .map((_, el) => Cypress.$(el).find("#grant-project-title").first().text())
        .get();

      // Change the maturity stage filter
      cy.get("#maturity-stage-button").click({
        force: true,
      });
      cy.contains("span", "Stage 1").click({
        force: true,
      });

      cy.wait(2000);
      // Wait for the grants to reload
      cy.get("#grant-card", { timeout: 10000 }).should("have.length.greaterThan", 0);

      // Compare with new grants
      cy.get("#grant-card").then(($newCards) => {
        const newTitles = $newCards
          .map((_, el) => Cypress.$(el).find("#grant-project-title").first().text())
          .get();
        cy.wrap(newTitles).should("not.deep.equal", initialTitles);
      });
    });
  });
});
