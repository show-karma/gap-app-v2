/**
 * E2E Tests: Community Page
 * Tests community page navigation and basic functionality
 */

import { EXAMPLE } from "../../support/e2e";
import {
  setupCommonIntercepts,
  waitForPageLoad,
} from "../../support/intercepts";

const COMMUNITY = EXAMPLE.COMMUNITY;

describe("Community Page", () => {
  beforeEach(() => {
    setupCommonIntercepts();
  });

  describe("Page Navigation", () => {
    it("should load community page", () => {
      cy.visit(`/${COMMUNITY}`, { timeout: 30000 });
      waitForPageLoad();

      cy.url().should("include", `/${COMMUNITY}`);
      cy.get("body").should("be.visible");
    });

    it("should navigate via community URL format", () => {
      cy.visit(`/community/${COMMUNITY}`, { timeout: 30000 });
      waitForPageLoad();

      cy.get("body").should("be.visible");
    });
  });

  describe("Page Structure", () => {
    it("should display page content", () => {
      cy.visit(`/${COMMUNITY}`, { timeout: 30000 });
      waitForPageLoad();

      cy.get("nav").should("exist");
      cy.get("body").should("be.visible");
    });

    it("should have navbar", () => {
      cy.visit(`/${COMMUNITY}`, { timeout: 30000 });
      waitForPageLoad();

      cy.get("nav").should("exist");
    });
  });

  describe("Navigation Integration", () => {
    it("should navigate to communities via Explore menu", () => {
      cy.visit("/");
      waitForPageLoad();

      cy.contains("button", "Explore").click();
      cy.contains("All communities").click();

      cy.url().should("include", "/communities");
    });

    it("should navigate from communities list", () => {
      cy.visit("/communities");
      waitForPageLoad();

      cy.get("body").should("be.visible");
    });
  });

  describe("Page Responsiveness", () => {
    it("should render on desktop viewport", () => {
      cy.viewport(1440, 900);
      cy.visit(`/${COMMUNITY}`, { timeout: 30000 });
      waitForPageLoad();

      cy.get("body").should("be.visible");
    });

    it("should render on mobile viewport", () => {
      cy.viewport("iphone-x");
      cy.visit(`/${COMMUNITY}`, { timeout: 30000 });
      waitForPageLoad();

      cy.get("body").should("be.visible");
    });
  });
});
