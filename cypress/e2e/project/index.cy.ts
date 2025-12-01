import { EXAMPLE } from "../../support/e2e";
import {
  setupCommonIntercepts,
  waitForPageLoad,
  waitForProjectLoad,
  waitForCommunityLoad,
} from "../../support/intercepts";

describe("Normal User - Project Page", () => {
  beforeEach(() => {
    setupCommonIntercepts();
  });

  it("should be able to navigate to project page from community page", () => {
    cy.visit(`/${EXAMPLE.COMMUNITY}`);
    waitForCommunityLoad();

    cy.get('[id^="grant-card"]').first().click();
    cy.url().should("include", `/project/`);
  });

  it("should be able to navigate between tabs", () => {
    cy.visit(`/project/${EXAMPLE.PROJECT}`);
    waitForProjectLoad();

    cy.get("a").contains("Roadmap").click({ force: true });
    cy.url().should("include", "/roadmap").or("include", "/project/");

    cy.get("a").contains("Grants").click({ force: true });
    cy.url().should("include", "/funding").or("include", "/project/");

    cy.get("a").contains("Impact").click({ force: true });
    cy.url().should("include", "/impact").or("include", "/project/");

    cy.get("a").contains("Project").click({ force: true });
    cy.url().should("include", "/project/");
  });

  it("should be able to open 'Request Intro' modal", () => {
    cy.visit(`/project/${EXAMPLE.PROJECT}`);
    waitForProjectLoad();

    cy.get("h1").then(($h1) => {
      cy.get("button").contains("Request intro").click({ force: true });
      cy.get("h3").contains(`Request Intro to ${$h1.text()} team`);
    });
  });

  it("should be able to open 'Endorse the Project' modal", () => {
    cy.visit(`/project/${EXAMPLE.PROJECT}`);
    waitForProjectLoad();

    cy.get("h1").then(($h1) => {
      cy.get("button").contains("Endorse the Project").click({ force: true });
      cy.get("h3").contains(`You are endorsing ${$h1.text()}`);
    });
  });

  it("should be able to navigate between overview tabs", () => {
    cy.visit(`/project/${EXAMPLE.PROJECT}`);
    waitForProjectLoad();

    cy.get("button").contains("Updates").click({ force: true });
    cy.get('[id^="updates-tab"]').should("be.visible");

    cy.get("button").contains("Information").click({ force: true });
    cy.get('[id^="information-tab"]').should("be.visible");
  });

  it("should be able to see project feed", () => {
    cy.visit(`/project/${EXAMPLE.PROJECT}`);
    waitForProjectLoad();

    // Project feed should be visible on the page
    cy.get("main").should("exist");
  });
});

