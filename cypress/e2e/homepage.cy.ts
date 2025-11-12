describe("Homepage", () => {
  it("should load and display key elements", () => {
    // Visit the homepage
    cy.visit("/");

    // Check if the navbar is present (uses <nav> element)
    cy.get("nav").should("exist");

    // Check if the main content area exists
    cy.get("main").should("exist");

    // Check if the footer is present
    cy.get("footer").should("exist");

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
