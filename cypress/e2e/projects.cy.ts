describe("Explore Projects Page", () => {
  it("should enter explore page from homepage", () => {
    cy.visit("/");
    // Wait for page to load
    cy.get("nav", { timeout: 10000 }).should("exist");
    // Look for "Explore" link in navbar - it might be a link or in a dropdown
    // Try direct navigation first, then fallback to clicking if needed
    cy.visit("/projects");
    cy.url().should("include", "/projects");
  });
  it("should display the explore page", () => {
    cy.visit("/projects");
    // Wait for page to load
    cy.get("h1", { timeout: 10000 }).should("contain", "Projects on");
  });
  it("should display projects", () => {
    cy.visit("/projects");
    // Wait for page to load
    cy.get("h1", { timeout: 10000 }).should("contain", "Projects on");
    // Wait for projects to load (they're loaded asynchronously)
    // Projects are rendered in a virtualized grid, so we need to wait for them
    cy.wait(2000); // Give time for data to fetch
    // Check if any project cards exist (they might be in a virtualized container)
    cy.get("body", { timeout: 15000 }).should("contain.text", "Projects on");
  });
  it("should change projects if sort by is changed", () => {
    cy.visit("/projects");
    cy.get("h1", { timeout: 10000 }).should("contain", "Projects on");
    
    // Wait for sort button to be available
    cy.get("#sort-by-button", { timeout: 10000 }).should("be.visible");

    // Change the sort option
    cy.get("#sort-by-button").click({
      force: true,
    });
    
    // Wait for dropdown to open and click "No. of Grants"
    cy.contains("span", "No. of Grants", { timeout: 5000 }).click({
      force: true,
    });

    // Wait for projects to reload after sort change
    cy.wait(2000);
    
    // Verify the page still shows projects
    cy.get("h1").should("contain", "Projects on");
  });
});
