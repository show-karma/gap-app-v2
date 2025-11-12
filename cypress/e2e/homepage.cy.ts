describe("Homepage", () => {
  it("should load and display key elements", () => {
    // Visit the homepage
    cy.visit("/");

    // Check if the navbar is present (uses <nav> element)
    cy.get("nav", { timeout: 10000 }).should("exist");

    // Check if the main content area exists (wait for it to load)
    cy.get("main", { timeout: 10000 }).should("exist");

    // Check if the footer is present
    cy.get("footer", { timeout: 10000 }).should("exist");

    // Check if the page loads without any console errors
    cy.window().then((win) => {
      cy.spy(win.console, "error").as("consoleError");
    });
    cy.get("@consoleError").should("not.be.called");
  });
  it("should display Sign in button", () => {
    cy.visit("/");
    cy.get("button")
      .contains(/sign in/i)
      .should("exist");
  });
});
