import { EXAMPLE } from "@/cypress/support/e2e";

describe("Normal User - Project Grants", () => {
	it("should be able to see grants", () => {
		cy.visit(`/project/${EXAMPLE.PROJECT}/funding`);
		cy.wait(1000);
		cy.get("[id^='project-grant']").should("have.length.greaterThan", 0);
	});

	it("should be able to navigate between grants", () => {
		cy.visit(`/project/${EXAMPLE.PROJECT}/funding`);
		cy.get("[id^='project-grant']").last().click({ force: true });
		cy.url().should("include", "/funding/0x");
		cy.get("[id^='project-grant']").first().click({ force: true });
		cy.url().should("include", "/funding/0x");
	});

	it("should be able to navigate between tabs", () => {
		cy.visit(`/project/${EXAMPLE.PROJECT}/funding`);
		cy.get("[id^='project-grant']").last().click({ force: true });
		cy.url().should("include", "/funding/0x");
		// navigate to milestones and updates
		cy.get("#tab-milestones-and-updates").click({ force: true });
		cy.get("#milestones-and-updates-list").should("be.visible");
		cy.url().should("include", "/milestones-and-updates");
		// navigate to impact criteria
		cy.get("#tab-impact-criteria").click({ force: true });
		cy.url().should("include", "/impact-criteria");
		// navigate to milestones and updates
		cy.get("#tab-overview").click({ force: true });
		cy.url().should("include", "/funding/0x");
	});
});
