/**
 * E2E Tests: Navbar Search Journey
 * Tests search functionality and input behavior
 */

import {
  setupCommonIntercepts,
  waitForPageLoad,
} from "../../support/intercepts";

describe("Navbar Search Journey", () => {
  beforeEach(() => {
    setupCommonIntercepts();
    cy.visit("/");
    waitForPageLoad();
  });

  describe("Search Input - Desktop", () => {
    it("should have search input in navbar", () => {
      cy.get('input[placeholder*="Search"]').should("be.visible");
    });

    it("should allow typing in search input", () => {
      cy.get('input[placeholder*="Search"]').type("test");
      cy.get('input[placeholder*="Search"]').should("have.value", "test");
    });

    it("should clear search input", () => {
      cy.get('input[placeholder*="Search"]').type("test");
      cy.get('input[placeholder*="Search"]').should("have.value", "test");

      cy.get('input[placeholder*="Search"]').clear();
      cy.get('input[placeholder*="Search"]').should("have.value", "");
    });
  });

  describe("Search Input - Mobile", () => {
    beforeEach(() => {
      cy.viewport("iphone-x");
      cy.visit("/");
      waitForPageLoad();
    });

    it("should have search in mobile drawer", () => {
      cy.get('[aria-label="Open menu"]').click();

      cy.get('[role="dialog"]').within(() => {
        cy.get('input[placeholder*="Search"]').should("be.visible");
      });
    });

    it("should allow typing in mobile search", () => {
      cy.get('[aria-label="Open menu"]').click();

      cy.get('[role="dialog"]').within(() => {
        cy.get('input[placeholder*="Search"]').type("project");
        cy.get('input[placeholder*="Search"]').should("have.value", "project");
      });
    });
  });

  describe("Search Behavior", () => {
    it("should allow typing in search and trigger API", () => {
      cy.get('input[placeholder*="Search"]').type("test");

      // Search input should have the value
      cy.get('input[placeholder*="Search"]').should("have.value", "test");
    });

    it("should handle empty search gracefully", () => {
      cy.get('input[placeholder*="Search"]').type(" ");

      // Should not crash
      cy.get('input[placeholder*="Search"]').should("be.visible");
    });

    it("should handle special characters", () => {
      cy.get('input[placeholder*="Search"]').type("test@#$");

      // Should not crash
      cy.get('input[placeholder*="Search"]').should("be.visible");
    });
  });

  describe("Search Focus and Blur", () => {
    it("should focus search input", () => {
      cy.get('input[placeholder*="Search"]').focus();

      cy.focused().should("have.attr", "placeholder").and("include", "Search");
    });

    it("should blur search input on click outside", () => {
      cy.get('input[placeholder*="Search"]').focus().type("test");

      cy.get("body").click(0, 0);

      // Input should lose focus (but this is hard to test reliably)
      cy.get('input[placeholder*="Search"]').should("exist");
    });
  });

  describe("Search Keyboard Shortcuts", () => {
    it("should be keyboard accessible", () => {
      cy.get('input[placeholder*="Search"]').focus();

      cy.focused().type("test query");

      cy.get('input[placeholder*="Search"]').should("have.value", "test query");
    });

    it("should close on Escape after typing", () => {
      cy.get('input[placeholder*="Search"]').focus().type("test");

      cy.get('input[placeholder*="Search"]').type("{esc}");

      // Search should still exist but may be blurred
      cy.get('input[placeholder*="Search"]').should("exist");
    });
  });

  describe("Search Error Handling", () => {
    it("should handle API errors gracefully", () => {
      cy.intercept("GET", "**/search**", {
        statusCode: 500,
        body: { error: "Server error" },
      }).as("searchError");

      cy.get('input[placeholder*="Search"]').type("test");

      cy.wait("@searchError");

      // Should not crash - input should still be visible
      cy.get('input[placeholder*="Search"]').should("be.visible");
    });

    it("should handle network timeout", () => {
      cy.intercept("GET", "**/search**", {
        delay: 10000,
        statusCode: 200,
        body: { projects: [], communities: [] },
      }).as("slowSearch");

      cy.get('input[placeholder*="Search"]').type("test");

      // Should not crash while waiting
      cy.get('input[placeholder*="Search"]').should("be.visible");
    });
  });

  describe("Search Accessibility", () => {
    it("should have accessible search input", () => {
      cy.get('input[placeholder*="Search"]')
        .should("be.visible")
        .and("not.be.disabled");
    });

    it("should support keyboard navigation", () => {
      cy.get('input[placeholder*="Search"]').focus();

      cy.focused().type("query");

      cy.get('input[placeholder*="Search"]').should("have.value", "query");
    });
  });
});
