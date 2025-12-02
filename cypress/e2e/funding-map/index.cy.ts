/**
 * E2E Tests: Funding Map Page
 * Tests funding map page navigation and basic functionality
 */

import {
  setupFundingMapIntercepts,
  waitForPageLoad,
} from "../../support/intercepts";

describe("Funding Map Page", () => {
  beforeEach(() => {
    setupFundingMapIntercepts();
  });

  describe("Page Navigation", () => {
    it("should load funding map page", () => {
      cy.visit("/funding-map");
      waitForPageLoad();

      cy.url().should("include", "/funding-map");
      cy.get("body").should("be.visible");
    });

    it("should display page content", () => {
      cy.visit("/funding-map");
      waitForPageLoad();

      cy.get("nav").should("exist");
      cy.get("body").should("be.visible");
    });

    it("should have proper page structure", () => {
      cy.visit("/funding-map");
      waitForPageLoad();

      cy.get("body").should("be.visible");
      cy.get("nav").should("exist");
    });
  });

  describe("Navigation Integration", () => {
    it("should navigate from homepage to funding map", () => {
      cy.visit("/");
      waitForPageLoad();

      cy.visit("/funding-map");
      waitForPageLoad();

      cy.url().should("include", "/funding-map");
    });

    it("should maintain navbar on funding map page", () => {
      cy.visit("/funding-map");
      waitForPageLoad();

      cy.get("nav").should("exist");
      cy.contains("button", "Explore").should("be.visible");
    });
  });

  describe("Page Responsiveness", () => {
    it("should render on desktop viewport", () => {
      cy.viewport(1440, 900);
      cy.visit("/funding-map");
      waitForPageLoad();

      cy.get("body").should("be.visible");
    });

    it("should render on tablet viewport", () => {
      cy.viewport(768, 1024);
      cy.visit("/funding-map");
      waitForPageLoad();

      cy.get("body").should("be.visible");
    });

    it("should render on mobile viewport", () => {
      cy.viewport("iphone-x");
      cy.visit("/funding-map");
      waitForPageLoad();

      cy.get("body").should("be.visible");
    });
  });
});
