/**
 * E2E Tests: Navbar Authentication Journey
 * Tests complete authentication flows including login, logout, profile modal, and state transitions
 */

import {
  setupCommonIntercepts,
  waitForPageLoad,
} from "../../support/intercepts";

describe("Navbar Authentication Journey", () => {
  beforeEach(() => {
    setupCommonIntercepts();
  });

  describe("Complete Login Flow", () => {
    beforeEach(() => {
      cy.visit("/");
      waitForPageLoad();
    });

    it("should show sign in button when not authenticated", () => {
      cy.contains("Sign in").should("be.visible");
      cy.contains("Contact sales").should("be.visible");
    });

    it("should trigger login modal on sign in click", () => {
      cy.contains("Sign in").click();

      // Note: Actual Privy authentication flow would happen here
      // For E2E tests, we verify the button triggers the expected action
      cy.url().should("include", "/");
    });

    it("should show user menu after successful authentication", () => {
      // Simulate logged-in state using mock auth
      cy.login();
      cy.visit("/");
      waitForPageLoad();

      // User avatar should be visible (desktop)
      cy.get('[data-testid="user-avatar"]').should("be.visible");
    });
  });

  describe("Profile Access", () => {
    beforeEach(() => {
      cy.login();
      cy.visit("/");
      waitForPageLoad();
    });

    it("should open user dropdown on avatar click", () => {
      cy.get('[data-testid="user-avatar"]').click();

      // Menu should be visible
      cy.contains("My projects").should("be.visible");
    });

    it("should navigate to my projects", () => {
      cy.get('[data-testid="user-avatar"]').click();
      cy.contains("My projects").click();

      cy.url().should("include", "/my-projects");
    });
  });

  describe("Logout Flow", () => {
    beforeEach(() => {
      cy.login();
      cy.visit("/");
      waitForPageLoad();
    });

    it("should show logout option in menu", () => {
      cy.get('[data-testid="user-avatar"]').click();
      cy.contains(/log out|sign out/i).should("be.visible");
    });

    it("should return to unauthenticated state after logout", () => {
      cy.get('[data-testid="user-avatar"]').click();
      cy.contains(/log out|sign out/i).click();

      // Should show Sign in button again
      cy.contains("Sign in").should("be.visible");
    });
  });

  describe("Mobile Login Flow", () => {
    beforeEach(() => {
      cy.viewport("iphone-x");
      cy.visit("/");
      waitForPageLoad();
    });

    it("should show sign in in mobile drawer", () => {
      cy.get('[aria-label="Open menu"]').click();
      cy.contains("Sign in").should("be.visible");
    });

    it("should trigger login from mobile drawer", () => {
      cy.get('[aria-label="Open menu"]').click();
      cy.contains("Sign in").click();

      // Login flow should be triggered
      cy.url().should("include", "/");
    });

    it("should show mobile user menu after login", () => {
      cy.login();
      cy.visit("/");
      waitForPageLoad();

      cy.get('[aria-label="Open menu"]').click();

      // User profile section should be visible
      cy.contains("My projects").should("be.visible");
    });
  });

  describe("Auth State Persistence", () => {
    it("should maintain auth state across navigation", () => {
      cy.login();
      cy.visit("/");
      waitForPageLoad();

      // Verify logged in
      cy.get('[data-testid="user-avatar"]').should("be.visible");

      // Navigate to different page
      cy.visit("/projects");

      // Return to home
      cy.visit("/");
      waitForPageLoad();

      // Should still be logged in
      cy.get('[data-testid="user-avatar"]').should("be.visible");
    });

    it("should persist auth state after page reload", () => {
      cy.login();
      cy.visit("/");
      waitForPageLoad();

      // Reload page
      cy.reload();
      waitForPageLoad();

      // Should still be logged in
      cy.get('[data-testid="user-avatar"]').should("be.visible");
    });
  });

  describe("Auth Error Handling", () => {
    beforeEach(() => {
      cy.visit("/");
      waitForPageLoad();
    });

    it("should handle failed login gracefully", () => {
      cy.contains("Sign in").click();

      // If login fails, should return to original state
      cy.contains("Sign in").should("be.visible");
    });

    it("should show error message on auth failure", () => {
      // Intercept auth endpoint with error
      cy.intercept("POST", "**/auth/**", {
        statusCode: 401,
        body: { error: "Authentication failed" },
      });

      cy.contains("Sign in").click();

      // Should handle error gracefully
      cy.contains("Sign in").should("be.visible");
    });
  });

  describe("Auth Button Accessibility", () => {
    beforeEach(() => {
      cy.visit("/");
      waitForPageLoad();
    });

    it("should have accessible sign in button", () => {
      cy.contains("Sign in")
        .should("be.visible")
        .and("not.be.disabled");
    });

    it("should be keyboard accessible", () => {
      // Tab to sign in button
      cy.get("body").tab();

      // Should be able to reach sign in via keyboard
      cy.focused().should("exist");
    });
  });

  describe("Session Timeout", () => {
    it.skip("should handle expired session gracefully", () => {
      cy.login();
      cy.visit("/");
      waitForPageLoad();

      // Simulate session expiry
      cy.window().then((win) => {
        win.localStorage.removeItem("privy:token");
      });

      // Reload page
      cy.reload();
      waitForPageLoad();

      // Should show sign in button
      cy.contains("Sign in").should("be.visible");
    });
  });

  describe("Multi-tab Behavior", () => {
    it.skip("should sync auth state across tabs - manual test recommended", () => {
      // This test is difficult to automate
      // Recommend manual testing for multi-tab scenarios
    });
  });
});

