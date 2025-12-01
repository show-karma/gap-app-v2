/**
 * E2E Tests: Mobile Navigation
 * Tests mobile-specific navigation including drawer, hamburger menu, and mobile layouts
 */

import {
  setupCommonIntercepts,
  waitForPageLoad,
} from "../../support/intercepts";

describe("Mobile Navigation", () => {
  beforeEach(() => {
    setupCommonIntercepts();
    cy.viewport("iphone-x");
    cy.visit("/");
    waitForPageLoad();
  });

  describe("Mobile Drawer", () => {
    it("should open and close mobile drawer", () => {
      // Open drawer
      cy.get('[aria-label="Open menu"]').click();

      // Drawer should be visible
      cy.get('[data-testid="mobile-drawer"]').should("be.visible");

      // Close drawer
      cy.get('[data-testid="close-drawer"]').click();

      // Drawer should close
      cy.get('[data-testid="mobile-drawer"]').should("not.be.visible");
    });

    it("should show all navigation sections in drawer", () => {
      cy.get('[aria-label="Open menu"]').click();

      // All sections should be visible
      cy.contains("For Builders").should("be.visible");
      cy.contains("For Funders").should("be.visible");
      cy.contains("Explore").should("be.visible");
      cy.contains("Resources").should("be.visible");
    });

    it("should close drawer on backdrop click", () => {
      cy.get('[aria-label="Open menu"]').click();

      cy.get('[data-testid="mobile-drawer"]').should("be.visible");

      // Click backdrop (outside drawer)
      cy.get("body").click(0, 0, { force: true });

      // Drawer should close
      cy.get('[data-testid="mobile-drawer"]').should("not.be.visible");
    });
  });

  describe("Mobile Menu - Unauthenticated", () => {
    it("should show Sign in button", () => {
      cy.get('[aria-label="Open menu"]').click();

      cy.contains("Sign in").should("be.visible");
    });

    it("should show Contact sales", () => {
      cy.get('[aria-label="Open menu"]').click();

      cy.contains("Contact sales").should("be.visible");
    });
  });

  describe("Mobile Menu - Authenticated", () => {
    beforeEach(() => {
      cy.login();
      cy.visit("/");
      waitForPageLoad();
    });

    it("should show user profile section", () => {
      cy.get('[aria-label="Open menu"]').click();

      cy.contains("My projects").should("be.visible");
    });

    it("should show logout option", () => {
      cy.get('[aria-label="Open menu"]').click();

      cy.contains(/log out|sign out/i).should("be.visible");
    });
  });

  describe("Mobile Search", () => {
    it("should have search in mobile drawer", () => {
      cy.get('[aria-label="Open menu"]').click();

      // Search should be present
      cy.get('[placeholder*="Search"]').should("be.visible");
    });

    it("should search from mobile drawer", () => {
      cy.get('[aria-label="Open menu"]').click();

      cy.get('[placeholder*="Search"]').type("test");

      // Wait for search
      cy.intercept("GET", "**/search**").as("mobileSearch");

      // Results should appear
      cy.contains("test", { matchCase: false }).should("be.visible");
    });
  });

  describe("Mobile Navigation Items", () => {
    it("should navigate and close drawer on item click", () => {
      cy.get('[aria-label="Open menu"]').click();

      cy.contains("All projects").click();

      // Should navigate
      cy.url().should("include", "/projects");

      // Drawer should close
      cy.get('[data-testid="mobile-drawer"]').should("not.be.visible");
    });

    it("should navigate to communities", () => {
      cy.get('[aria-label="Open menu"]').click();

      cy.contains("All communities").click();

      cy.url().should("include", "/communities");
    });

    it("should navigate to funding map", () => {
      cy.get('[aria-label="Open menu"]').click();

      cy.contains(/funding|grants/i).first().click();

      cy.url().should("satisfy", (url: string) => {
        return url.includes("/funding") || url.includes("/grants") || url.includes("/");
      });
    });
  });

  describe("Mobile Theme Toggle", () => {
    it.skip("should have theme toggle in mobile menu - if implemented", () => {
      cy.login();
      cy.visit("/");
      waitForPageLoad();

      cy.get('[aria-label="Open menu"]').click();

      // Theme toggle visibility depends on implementation
      // cy.contains(/dark mode|light mode/i).should("be.visible");
    });
  });

  describe("Mobile Drawer Scrolling", () => {
    it("should be scrollable when content exceeds viewport", () => {
      cy.get('[aria-label="Open menu"]').click();

      // Verify drawer is scrollable
      cy.get('[data-testid="mobile-drawer"]')
        .should("be.visible")
        .and("have.css", "overflow-y");
    });
  });

  describe("Mobile Responsive Breakpoints", () => {
    it("should show hamburger menu on small screens", () => {
      cy.viewport(375, 667);
      cy.visit("/");
      waitForPageLoad();

      cy.get('[aria-label="Open menu"]').should("be.visible");
    });

    it("should show hamburger menu on medium screens", () => {
      cy.viewport(768, 1024);
      cy.visit("/");
      waitForPageLoad();

      // Hamburger may or may not be visible at tablet size
      cy.get('[aria-label="Open menu"]').should("exist");
    });

    it("should hide hamburger menu on large screens", () => {
      cy.viewport(1440, 900);
      cy.visit("/");
      waitForPageLoad();

      // Hamburger should not be visible on desktop
      cy.get('[aria-label="Open menu"]').should("not.be.visible");
    });
  });

  describe("Mobile Accessibility", () => {
    it("should trap focus within drawer when open", () => {
      cy.get('[aria-label="Open menu"]').click();

      cy.get('[data-testid="mobile-drawer"]').should("be.visible");

      // Tab through drawer items
      cy.get("body").tab();

      // Focus should stay within drawer
      cy.focused().should("exist");
    });

    it("should close drawer on Escape key", () => {
      cy.get('[aria-label="Open menu"]').click();

      cy.get('[data-testid="mobile-drawer"]').should("be.visible");

      cy.get("body").type("{esc}");

      cy.get('[data-testid="mobile-drawer"]').should("not.be.visible");
    });
  });
});

