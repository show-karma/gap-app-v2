const community = "gitcoin";
describe("Community Page", () => {
  it("should display the community page", () => {
    cy.visit(`/${community}`);
  });
  it("should display projects", () => {
    cy.visit(`/${community}`);
    cy.get("#grant-card").should("have.length.greaterThan", 0);
  });
});
