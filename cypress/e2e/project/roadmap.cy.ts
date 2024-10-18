import { EXAMPLE } from "../../support/e2e";

describe("Project Roadmap", () => {
  it("should be able to see roadmap", () => {
    cy.visit(`/project/${EXAMPLE.PROJECT}/roadmap`);
    cy.wait(1000);
    cy.get("h1").then(($h1) => {
      cy.get("h3").contains(`${$h1.text()} Roadmap`).should("be.visible");
    });
  });
});
