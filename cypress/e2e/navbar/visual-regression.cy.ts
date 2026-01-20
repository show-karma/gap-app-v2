/**
 * E2E Tests: Navbar UI States
 * Tests navbar components appearance across different states and viewports
 */

import {
  setupCommonIntercepts,
  waitForPageLoad,
} from "../../support/intercepts";

describe("Navbar UI States", () => {
  beforeEach(() => {
    setupCommonIntercepts();
  });

  describe("Desktop Navbar Appearance", () => {
    beforeEach(() => {
      cy.viewport(1440, 900);
      cy.visit("/");
      waitForPageLoad();
    });

    it("should display navbar in default state", () => {
      cy.get("nav").should("be.visible");
      cy.contains("button", "For Builders").should("be.visible");
      cy.contains("button", "For Funders").should("be.visible");
      cy.contains("button", "Explore").should("be.visible");
    });

    it("should display For Builders dropdown", () => {
      cy.contains("button", "For Builders").click();
      cy.contains("Create project").should("be.visible");
      cy.contains("Find funding").should("be.visible");
    });

    it("should display For Funders dropdown", () => {
      cy.contains("button", "For Funders").click();
      // Menu should open
      cy.get('[data-state="open"]').should("exist");
    });

    it("should display Explore dropdown", () => {
      cy.contains("button", "Explore").click();
      cy.contains("All projects").should("be.visible");
      cy.contains("All communities").should("be.visible");
    });

    it("should display Resources dropdown", () => {
      cy.contains("button", "Resources").click();
      cy.contains("Docs").should("be.visible");
    });
  });

  describe("Search UI States", () => {
    beforeEach(() => {
      cy.viewport(1440, 900);
      cy.visit("/");
      waitForPageLoad();
    });

    it("should display search input", () => {
      cy.get('input[placeholder*="Search"]').should("be.visible");
    });

    it("should allow typing in search", () => {
      cy.get('input[placeholder*="Search"]').type("test");
      cy.get('input[placeholder*="Search"]').should("have.value", "test");
    });
  });

  describe("Button Interactions", () => {
    beforeEach(() => {
      cy.viewport(1440, 900);
      cy.visit("/");
      waitForPageLoad();
    });

    it("should show hover state on buttons", () => {
      cy.contains("button", "For Builders")
        .should("be.visible")
        .trigger("mouseover");
      
      // Button should still be visible after hover
      cy.contains("button", "For Builders").should("be.visible");
    });

    it("should show menu items on click", () => {
      cy.contains("button", "For Builders").click();
      cy.contains("Create project").should("be.visible");
    });
  });

  describe("Focus States", () => {
    beforeEach(() => {
      cy.viewport(1440, 900);
      cy.visit("/");
      waitForPageLoad();
    });

    it("should focus button with keyboard", () => {
      cy.contains("button", "For Builders").focus();
      cy.focused().should("contain", "For Builders");
    });

    it("should focus search input", () => {
      cy.get('input[placeholder*="Search"]').focus();
      cy.focused().should("have.attr", "placeholder").and("include", "Search");
    });
  });

  describe("Tablet Appearance", () => {
    it("should display navbar on tablet", () => {
      cy.viewport(768, 1024);
      cy.visit("/");
      waitForPageLoad();

      cy.get("nav").should("be.visible");
    });
  });

  describe("Mobile Appearance", () => {
    beforeEach(() => {
      cy.viewport(375, 667);
      cy.visit("/");
      waitForPageLoad();
    });

    it("should display mobile navbar", () => {
      cy.get("nav").should("be.visible");
      cy.get('[aria-label="Open menu"]').should("be.visible");
    });

    it("should open mobile drawer", () => {
      cy.get('[aria-label="Open menu"]').click();
      cy.get('[role="dialog"]').should("be.visible");
      cy.contains("Menu").should("be.visible");
    });
  });

  describe("Auth Buttons Display", () => {
    it("should display Sign in button on desktop", () => {
      cy.viewport(1440, 900);
      cy.visit("/");
      waitForPageLoad();

      cy.contains("Sign in").should("be.visible");
      cy.contains("Contact sales").should("be.visible");
    });

    it("should display Sign in button on mobile", () => {
      cy.viewport(375, 667);
      cy.visit("/");
      waitForPageLoad();

      // On mobile, the Sign in button is in the header (not inside the drawer)
      cy.contains("button", "Sign in").should("be.visible");
      cy.contains("Contact sales").should("be.visible");
    });
  });
});
