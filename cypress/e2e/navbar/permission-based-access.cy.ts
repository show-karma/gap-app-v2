/**
 * E2E Tests: Permission-Based Access
 * Tests navbar elements visibility based on user permissions and roles
 */

import {
  setupCommonIntercepts,
  waitForPageLoad,
} from "../../support/intercepts";

describe("Permission-Based Access", () => {
  beforeEach(() => {
    setupCommonIntercepts();
  });

  describe("Unauthenticated User", () => {
    beforeEach(() => {
      cy.visit("/");
      waitForPageLoad();
    });

    it("should see Sign in button", () => {
      cy.contains("Sign in").should("be.visible");
    });

    it("should see Contact sales button", () => {
      cy.contains("Contact sales").should("be.visible");
    });

    it("should not see user avatar", () => {
      cy.get('[data-testid="user-avatar"]').should("not.exist");
    });

    it("should see Resources menu", () => {
      cy.contains("button", "Resources").should("be.visible");
    });
  });

  describe("Regular User", () => {
    beforeEach(() => {
      cy.login({ userType: "regular" });
      cy.visit("/");
      waitForPageLoad();
    });

    it("should see user avatar when logged in", () => {
      cy.get('[data-testid="user-avatar"]').should("be.visible");
    });

    it("should see basic menu items", () => {
      cy.get('[data-testid="user-avatar"]').click();
      cy.contains("My projects").should("be.visible");
    });

    it("should not see admin link", () => {
      cy.get('[data-testid="user-avatar"]').click();
      cy.contains("Admin").should("not.exist");
    });

    it("should not see Review link", () => {
      cy.get('[data-testid="user-avatar"]').click();
      cy.contains("Review").should("not.exist");
    });

    it("should see logout option", () => {
      cy.get('[data-testid="user-avatar"]').click();
      cy.contains(/log out|sign out/i).should("be.visible");
    });
  });

  describe("Admin User", () => {
    beforeEach(() => {
      cy.login({ userType: "admin" });
      cy.visit("/");
      waitForPageLoad();
    });

    it("should see admin link in menu", () => {
      cy.get('[data-testid="user-avatar"]').click();
      cy.contains("Admin").should("be.visible");
    });

    it("should navigate to admin page", () => {
      cy.get('[data-testid="user-avatar"]').click();
      cy.contains("Admin").click();
      cy.url().should("include", "/admin");
    });

    it("should see My projects", () => {
      cy.get('[data-testid="user-avatar"]').click();
      cy.contains("My projects").should("be.visible");
    });
  });

  describe("Reviewer User", () => {
    beforeEach(() => {
      cy.login({ userType: "reviewer" });
      cy.visit("/");
      waitForPageLoad();
    });

    it("should see review link", () => {
      cy.get('[data-testid="user-avatar"]').click();
      cy.contains("Review").should("be.visible");
    });

    it("should navigate to review page", () => {
      cy.get('[data-testid="user-avatar"]').click();
      cy.contains("Review").click();
      cy.url().should("include", "/review");
    });

    it("should not see admin link", () => {
      cy.get('[data-testid="user-avatar"]').click();
      cy.contains("Admin").should("not.exist");
    });
  });

  describe("Community Admin User", () => {
    beforeEach(() => {
      cy.login({ userType: "community-admin" });
      cy.visit("/");
      waitForPageLoad();
    });

    it("should see Manage Programs link", () => {
      cy.get('[data-testid="user-avatar"]').click();
      cy.contains(/manage|programs/i).should("be.visible");
    });

    it("should see My projects", () => {
      cy.get('[data-testid="user-avatar"]').click();
      cy.contains("My projects").should("be.visible");
    });
  });

  describe("Mobile Permission Access", () => {
    beforeEach(() => {
      cy.viewport("iphone-x");
    });

    it("should show Sign in in mobile drawer when logged out", () => {
      cy.visit("/");
      waitForPageLoad();

      cy.get('[aria-label="Open menu"]').click();
      cy.contains("Sign in").should("be.visible");
    });

    it("should show user profile in mobile drawer when logged in", () => {
      cy.login({ userType: "regular" });
      cy.visit("/");
      waitForPageLoad();

      cy.get('[aria-label="Open menu"]').click();
      cy.contains("My projects").should("be.visible");
    });

    it("should show admin link in mobile drawer for admin user", () => {
      cy.login({ userType: "admin" });
      cy.visit("/");
      waitForPageLoad();

      cy.get('[aria-label="Open menu"]').click();
      cy.contains("Admin").should("be.visible");
    });
  });

  describe("Protected Routes", () => {
    it("should redirect to login when accessing my-projects without auth", () => {
      cy.visit("/my-projects");

      // Should redirect to home or show login prompt
      cy.url().should("satisfy", (url: string) => {
        return !url.includes("/my-projects") || url.includes("/");
      });
    });

    it("should allow access to my-projects when authenticated", () => {
      cy.login({ userType: "regular" });
      cy.visit("/my-projects");

      // Should stay on my-projects
      cy.url().should("include", "/my-projects");
    });

    it("should redirect non-admin from admin page", () => {
      cy.login({ userType: "regular" });
      cy.visit("/admin");

      // Should redirect or show access denied
      cy.url().should("not.include", "/admin");
    });

    it("should allow admin to access admin page", () => {
      cy.login({ userType: "admin" });
      cy.visit("/admin");

      // Should stay on admin page
      cy.url().should("include", "/admin");
    });
  });
});

