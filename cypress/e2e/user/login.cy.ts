describe("Homepage", () => {
  it("should be able to login", () => {
    cy.visit("/");
    cy.get("button")
      .contains(/login|register/i)
      .should("exist")
      .click();
    cy.get("div").contains("MetaMask").should("exist").click();
    // Use Synpress command to connect MetaMask to the dApp
    // cy.connectToDapp();

    // Verify that the connected account address is displayed correctly
    // cy.get("#accounts").should(
    //   "have.text",
    //   "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
    // );
  });
});
