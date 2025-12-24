/**
 * E2E Tests: Chain Payout Address Modal
 *
 * Tests the chain-specific payout address feature:
 * - Enable Donations button visibility
 * - Set Payout Address modal functionality
 * - Form validation
 * - Save/update operations
 * - Authorization checks
 */

import { setupCommonIntercepts, waitForPageLoad } from "../../support/intercepts";

describe("Chain Payout Address Modal", () => {
  // Test data
  const TEST_PROJECT_SLUG = "test-project";
  const VALID_ADDRESS = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed";
  const VALID_ADDRESS_2 = "0x1234567890123456789012345678901234567890";

  // Mock project data
  const mockProject = {
    uid: "0xTESTPROJECT123",
    chainID: 10,
    owner: "0x1234567890123456789012345678901234567890",
    chainPayoutAddress: null,
    details: {
      title: "Test Project",
      slug: TEST_PROJECT_SLUG,
      description: "A test project",
    },
    members: [],
  };

  const mockProjectWithAddresses = {
    ...mockProject,
    chainPayoutAddress: {
      "10": VALID_ADDRESS,
      "42161": VALID_ADDRESS_2,
    },
  };

  beforeEach(() => {
    setupCommonIntercepts();

    // Mock project API response
    cy.intercept("GET", `**/projects/${TEST_PROJECT_SLUG}`, (req) => {
      req.reply({
        statusCode: 200,
        body: mockProject,
      });
    }).as("getProject");

    // Mock project members/admin check
    cy.intercept("GET", `**/projects/${TEST_PROJECT_SLUG}/members`, (req) => {
      req.reply({
        statusCode: 200,
        body: [],
      });
    }).as("getProjectMembers");
  });

  describe("Enable Donations Button", () => {
    it("should show Enable Donations button when user is project owner and no addresses configured", () => {
      cy.login({ userType: "regular" });

      // Mock as project owner
      cy.intercept("GET", `**/projects/${TEST_PROJECT_SLUG}`, (req) => {
        req.reply({
          statusCode: 200,
          body: {
            ...mockProject,
            owner: "0x1234567890123456789012345678901234567890", // matches regular user
          },
        });
      }).as("getProjectOwner");

      cy.visit(`/project/${TEST_PROJECT_SLUG}`);
      waitForPageLoad();

      // Button should be visible for project owner
      cy.get('[data-testid="enable-donations-button"]').should("be.visible");
      cy.get('[data-testid="enable-donations-button"]').should("contain", "Enable Donations");
    });

    it("should NOT show Enable Donations button when addresses are already configured", () => {
      cy.login({ userType: "regular" });

      cy.intercept("GET", `**/projects/${TEST_PROJECT_SLUG}`, (req) => {
        req.reply({
          statusCode: 200,
          body: {
            ...mockProjectWithAddresses,
            owner: "0x1234567890123456789012345678901234567890",
          },
        });
      }).as("getProjectWithAddresses");

      cy.visit(`/project/${TEST_PROJECT_SLUG}`);
      waitForPageLoad();

      // Button should NOT be visible when addresses exist
      cy.get('[data-testid="enable-donations-button"]').should("not.exist");
    });

    it("should NOT show Enable Donations button for non-authorized users", () => {
      // Not logged in
      cy.visit(`/project/${TEST_PROJECT_SLUG}`);
      waitForPageLoad();

      cy.get('[data-testid="enable-donations-button"]').should("not.exist");
    });

    it("should open modal when Enable Donations button is clicked", () => {
      cy.login({ userType: "regular" });

      cy.intercept("GET", `**/projects/${TEST_PROJECT_SLUG}`, (req) => {
        req.reply({
          statusCode: 200,
          body: {
            ...mockProject,
            owner: "0x1234567890123456789012345678901234567890",
          },
        });
      }).as("getProjectOwner");

      cy.visit(`/project/${TEST_PROJECT_SLUG}`);
      waitForPageLoad();

      cy.get('[data-testid="enable-donations-button"]').click();

      // Modal should be visible
      cy.get('[role="dialog"]').should("be.visible");
      cy.get('[role="dialog"]').should("contain", "Set Payout Addresses");
    });
  });

  describe("Set Payout Address Modal", () => {
    beforeEach(() => {
      cy.login({ userType: "regular" });

      cy.intercept("GET", `**/projects/${TEST_PROJECT_SLUG}`, (req) => {
        req.reply({
          statusCode: 200,
          body: {
            ...mockProject,
            owner: "0x1234567890123456789012345678901234567890",
          },
        });
      }).as("getProjectOwner");
    });

    it("should display all supported chains", () => {
      cy.visit(`/project/${TEST_PROJECT_SLUG}`);
      waitForPageLoad();

      cy.get('[data-testid="enable-donations-button"]').click();

      // Check for common chain names
      cy.get('[role="dialog"]').should("contain", "Optimism");
      cy.get('[role="dialog"]').should("contain", "Base");
      cy.get('[role="dialog"]').should("contain", "Arbitrum");
    });

    it("should display chain icons", () => {
      cy.visit(`/project/${TEST_PROJECT_SLUG}`);
      waitForPageLoad();

      cy.get('[data-testid="enable-donations-button"]').click();

      // Check that chain icons are loaded
      cy.get('[role="dialog"] img').should("have.length.at.least", 1);
    });

    it("should have input fields for each chain", () => {
      cy.visit(`/project/${TEST_PROJECT_SLUG}`);
      waitForPageLoad();

      cy.get('[data-testid="enable-donations-button"]').click();

      // Each chain should have an input
      cy.get('[role="dialog"] input[type="text"]').should("have.length.at.least", 1);
    });

    it("should close modal when clicking Cancel", () => {
      cy.visit(`/project/${TEST_PROJECT_SLUG}`);
      waitForPageLoad();

      cy.get('[data-testid="enable-donations-button"]').click();
      cy.get('[role="dialog"]').should("be.visible");

      cy.get('[role="dialog"]').contains("button", "Cancel").click();

      cy.get('[role="dialog"]').should("not.exist");
    });

    it("should close modal when clicking X button", () => {
      cy.visit(`/project/${TEST_PROJECT_SLUG}`);
      waitForPageLoad();

      cy.get('[data-testid="enable-donations-button"]').click();
      cy.get('[role="dialog"]').should("be.visible");

      cy.get('[role="dialog"] button').first().click(); // X button is first

      cy.get('[role="dialog"]').should("not.exist");
    });
  });

  describe("Form Validation", () => {
    beforeEach(() => {
      cy.login({ userType: "regular" });

      cy.intercept("GET", `**/projects/${TEST_PROJECT_SLUG}`, (req) => {
        req.reply({
          statusCode: 200,
          body: {
            ...mockProject,
            owner: "0x1234567890123456789012345678901234567890",
          },
        });
      }).as("getProjectOwner");
    });

    it("should show validation error for invalid address format", () => {
      cy.visit(`/project/${TEST_PROJECT_SLUG}`);
      waitForPageLoad();

      cy.get('[data-testid="enable-donations-button"]').click();

      // Enter invalid address
      cy.get('[role="dialog"] input[type="text"]').first().type("invalid-address");

      // Wait for debounced validation
      cy.wait(500);

      // Should show validation error
      cy.get('[role="dialog"]').should("contain", "Invalid");
    });

    it("should show validation error for address without 0x prefix", () => {
      cy.visit(`/project/${TEST_PROJECT_SLUG}`);
      waitForPageLoad();

      cy.get('[data-testid="enable-donations-button"]').click();

      // Enter address without 0x
      cy.get('[role="dialog"] input[type="text"]').first().type("1234567890123456789012345678901234567890");

      cy.wait(500);

      cy.get('[role="dialog"]').should("contain", "0x");
    });

    it("should show checkmark for valid address", () => {
      cy.visit(`/project/${TEST_PROJECT_SLUG}`);
      waitForPageLoad();

      cy.get('[data-testid="enable-donations-button"]').click();

      // Enter valid address
      cy.get('[role="dialog"] input[type="text"]').first().clear().type(VALID_ADDRESS);

      cy.wait(500);

      // Should show checkmark (CheckIcon)
      cy.get('[role="dialog"] svg.text-green-500').should("exist");
    });

    it("should disable Save button when there are validation errors", () => {
      cy.visit(`/project/${TEST_PROJECT_SLUG}`);
      waitForPageLoad();

      cy.get('[data-testid="enable-donations-button"]').click();

      // Enter invalid address
      cy.get('[role="dialog"] input[type="text"]').first().type("invalid");

      cy.wait(500);

      // Save button should be disabled
      cy.get('[role="dialog"]').contains("button", "Save").should("be.disabled");
    });
  });

  describe("Save Operations", () => {
    beforeEach(() => {
      cy.login({ userType: "regular" });

      cy.intercept("GET", `**/projects/${TEST_PROJECT_SLUG}`, (req) => {
        req.reply({
          statusCode: 200,
          body: {
            ...mockProject,
            owner: "0x1234567890123456789012345678901234567890",
          },
        });
      }).as("getProjectOwner");
    });

    it("should save addresses successfully", () => {
      // Mock the update endpoint
      cy.intercept("PUT", `**/v2/projects/*/chain-payout-address`, (req) => {
        req.reply({
          statusCode: 200,
          body: {
            chainPayoutAddress: req.body.chainPayoutAddresses,
          },
        });
      }).as("updateChainPayoutAddress");

      // Mock project refresh
      cy.intercept("GET", `**/projects/${TEST_PROJECT_SLUG}`, (req) => {
        req.reply({
          statusCode: 200,
          body: {
            ...mockProject,
            owner: "0x1234567890123456789012345678901234567890",
            chainPayoutAddress: { "10": VALID_ADDRESS },
          },
        });
      }).as("getProjectRefreshed");

      cy.visit(`/project/${TEST_PROJECT_SLUG}`);
      waitForPageLoad();

      cy.get('[data-testid="enable-donations-button"]').click();

      // Enter valid address
      cy.get('[role="dialog"] input[type="text"]').first().clear().type(VALID_ADDRESS);

      cy.wait(500);

      // Click Save
      cy.get('[role="dialog"]').contains("button", "Save").click();

      // Wait for API call
      cy.wait("@updateChainPayoutAddress");

      // Modal should close
      cy.get('[role="dialog"]').should("not.exist");

      // Should show success toast
      cy.get('[role="status"]').should("contain", "success");
    });

    it("should show error message on save failure", () => {
      // Mock the update endpoint to fail
      cy.intercept("PUT", `**/v2/projects/*/chain-payout-address`, (req) => {
        req.reply({
          statusCode: 403,
          body: {
            error: "Access denied",
          },
        });
      }).as("updateChainPayoutAddressFail");

      cy.visit(`/project/${TEST_PROJECT_SLUG}`);
      waitForPageLoad();

      cy.get('[data-testid="enable-donations-button"]').click();

      // Enter valid address
      cy.get('[role="dialog"] input[type="text"]').first().clear().type(VALID_ADDRESS);

      cy.wait(500);

      // Click Save
      cy.get('[role="dialog"]').contains("button", "Save").click();

      // Wait for API call
      cy.wait("@updateChainPayoutAddressFail");

      // Modal should stay open
      cy.get('[role="dialog"]').should("be.visible");

      // Should show error message at top of modal
      cy.get('[role="dialog"] .bg-red-600').should("be.visible");
      cy.get('[role="dialog"] .bg-red-600').should("contain", "Access denied");
    });

    it("should show 'No changes to save' when nothing changed", () => {
      cy.intercept("GET", `**/projects/${TEST_PROJECT_SLUG}`, (req) => {
        req.reply({
          statusCode: 200,
          body: {
            ...mockProjectWithAddresses,
            owner: "0x1234567890123456789012345678901234567890",
          },
        });
      }).as("getProjectWithAddresses");

      cy.visit(`/project/${TEST_PROJECT_SLUG}`);
      waitForPageLoad();

      // Open from menu since Enable Donations won't show
      cy.get('[data-testid="project-options-menu"]').click();
      cy.contains("Set Payout Address").click();

      // Don't change anything, just click Save
      cy.get('[role="dialog"]').contains("button", "Update").click();

      // Should show toast about no changes
      cy.get('[role="status"]').should("contain", "No changes");
    });
  });

  describe("Menu Access", () => {
    it("should show Set Payout Address in options menu for project owner", () => {
      cy.login({ userType: "regular" });

      cy.intercept("GET", `**/projects/${TEST_PROJECT_SLUG}`, (req) => {
        req.reply({
          statusCode: 200,
          body: {
            ...mockProjectWithAddresses,
            owner: "0x1234567890123456789012345678901234567890",
          },
        });
      }).as("getProjectWithAddresses");

      cy.visit(`/project/${TEST_PROJECT_SLUG}`);
      waitForPageLoad();

      // Open options menu
      cy.get('[data-testid="project-options-menu"]').click();

      // Should have Set Payout Address option
      cy.contains("Set Payout Address").should("be.visible");
    });

    it("should open modal from menu", () => {
      cy.login({ userType: "regular" });

      cy.intercept("GET", `**/projects/${TEST_PROJECT_SLUG}`, (req) => {
        req.reply({
          statusCode: 200,
          body: {
            ...mockProjectWithAddresses,
            owner: "0x1234567890123456789012345678901234567890",
          },
        });
      }).as("getProjectWithAddresses");

      cy.visit(`/project/${TEST_PROJECT_SLUG}`);
      waitForPageLoad();

      cy.get('[data-testid="project-options-menu"]').click();
      cy.contains("Set Payout Address").click();

      // Modal should open with existing addresses pre-filled
      cy.get('[role="dialog"]').should("be.visible");
      cy.get('[role="dialog"]').should("contain", "Manage Payout Addresses");

      // First input should have the existing address
      cy.get('[role="dialog"] input[type="text"]').first().should("have.value", VALID_ADDRESS);
    });

    it("should NOT show Set Payout Address in menu for non-authorized users", () => {
      // Not logged in
      cy.visit(`/project/${TEST_PROJECT_SLUG}`);
      waitForPageLoad();

      // Menu should not be visible for unauthorized users
      cy.get('[data-testid="project-options-menu"]').should("not.exist");
    });
  });

  describe("Staff Access", () => {
    it("should allow staff to see and use Enable Donations button", () => {
      cy.login({ userType: "admin" });

      cy.intercept("GET", `**/projects/${TEST_PROJECT_SLUG}`, (req) => {
        req.reply({
          statusCode: 200,
          body: mockProject, // No chainPayoutAddress, not owner
        });
      }).as("getProject");

      cy.visit(`/project/${TEST_PROJECT_SLUG}`);
      waitForPageLoad();

      // Staff should see the button even if not owner
      cy.get('[data-testid="enable-donations-button"]').should("be.visible");
    });

    it("should allow staff to access Set Payout Address from menu", () => {
      cy.login({ userType: "admin" });

      cy.intercept("GET", `**/projects/${TEST_PROJECT_SLUG}`, (req) => {
        req.reply({
          statusCode: 200,
          body: mockProjectWithAddresses,
        });
      }).as("getProjectWithAddresses");

      cy.visit(`/project/${TEST_PROJECT_SLUG}`);
      waitForPageLoad();

      cy.get('[data-testid="project-options-menu"]').click();
      cy.contains("Set Payout Address").should("be.visible");
    });
  });
});
