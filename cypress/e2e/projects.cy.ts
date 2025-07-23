describe("Explore Projects Page", () => {
	it("should enter explore page from homepage", () => {
		cy.visit("/");
		cy.get("button").contains("Explore projects").click({
			force: true,
		});
		cy.url().should("include", "/projects");
	});
	it("should display the explore page", () => {
		cy.visit("/projects");
		cy.get("h1").contains("Projects on GAP");
	});
	it("should display projects", () => {
		cy.visit("/projects");
		cy.get("#project-card").should("have.length.greaterThan", 0);
	});
	it("should change projects if sort by is changed", () => {
		cy.visit("/projects");
		cy.get("#project-card").should("have.length.greaterThan", 0);

		// Store the initial projects
		cy.get("#project-card").then(($initialCards) => {
			const initialTitles = $initialCards
				.map((_, el) => Cypress.$(el).find("p").first().text())
				.get();

			// Change the sort option
			cy.get("#sort-by-button").click({
				force: true,
			});
			cy.contains("span", "No. of Grants").click({
				force: true,
			});

			// Wait for the projects to reload
			cy.get("#project-card").should("have.length.greaterThan", 0);

			// Compare with new projects
			cy.get("#project-card").then(($newCards) => {
				const newTitles = $newCards
					.map((_, el) => Cypress.$(el).find("p").first().text())
					.get();
				cy.wrap(newTitles).should("not.deep.equal", initialTitles);
			});
		});
	});
});
