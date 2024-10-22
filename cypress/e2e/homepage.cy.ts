describe("Homepage", () => {
  it("should load and display key elements", () => {
    // Visit the homepage
    cy.visit("/");

    // Check if the header is present
    cy.get("header").should("exist");

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
  it("should display Login / register button", () => {
    cy.visit("/");
    cy.get("button")
      .contains(/login|register/i)
      .should("exist");
  });
});
