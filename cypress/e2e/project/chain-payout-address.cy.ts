/**
 * E2E Tests: Chain Payout Address Modal
 *
 * Tests the chain-specific payout address feature:
 * - Enable Donations button visibility
 * - Set Payout Address modal functionality
 * - Form validation
 * - Save/update operations
 * - Authorization checks
 *
 * Auth is handled via the NEXT_PUBLIC_E2E_AUTH_BYPASS mechanism:
 * cy.login() sets localStorage mock state, and useAuth() reads it
 * when running under Cypress. Blockchain RPC calls (isOwner, isAdmin)
 * are intercepted via setupRpcIntercepts().
 */

import { setupIndexerCatchAll, setupRpcIntercepts, waitForPageLoad } from "../../support/intercepts";

describe("Chain Payout Address Modal", () => {
  // Capture uncaught exceptions to prevent test failures from unrelated errors
  // (e.g., Privy SDK, third-party scripts) and log them for debugging.
  Cypress.on("uncaught:exception", (err) => {
    // Log the error so CI output captures it
    Cypress.log({ name: "uncaught:exception", message: err.message });
    // Return false to prevent Cypress from failing the test
    return false;
  });

  // Test data
  const TEST_PROJECT_SLUG = "test-project";
  const MOCK_REGULAR_ADDRESS = "0x1234567890123456789012345678901234567890";
  const VALID_ADDRESS = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed";
  const VALID_ADDRESS_2 = MOCK_REGULAR_ADDRESS;

  // Mock project data (includes fields needed by both the frontend and the SDK)
  const mockProject = {
    uid: "0xabc123def456789000000000000000000000000000000000000000000000dead",
    chainID: 10,
    owner: MOCK_REGULAR_ADDRESS,
    recipient: MOCK_REGULAR_ADDRESS,
    attester: MOCK_REGULAR_ADDRESS,
    refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
    revoked: false,
    revocationTime: 0,
    createdAt: Math.floor(Date.now() / 1000),
    chainPayoutAddress: null,
    data: { project: true },
    details: {
      uid: "0xabc123def456789000000000000000000000000000000000000000000000beef",
      title: "Test Project",
      slug: TEST_PROJECT_SLUG,
      description: "A test project",
      data: {
        title: "Test Project",
        slug: TEST_PROJECT_SLUG,
        description: "A test project",
        links: [],
        tags: [],
      },
      chainID: 10,
    },
    members: [],
    grants: [],
    impacts: [],
    endorsements: [],
    updates: [],
    pointers: [],
    communities: [],
    external: { gitcoin: [], oso: [], github: [], network_addresses: [], divvi_wallets: [] },
  };

  const mockProjectWithAddresses = {
    ...mockProject,
    chainPayoutAddress: {
      "10": VALID_ADDRESS,
      "42161": VALID_ADDRESS_2,
    },
  };

  beforeEach(() => {
    // Catch-all FIRST (lowest priority in Cypress LIFO matching).
    // Prevents unhandled requests from reaching the real staging indexer
    // (behind Cloudflare). Specific intercepts registered after this
    // take priority because Cypress uses last-registered-wins matching.
    setupIndexerCatchAll();

    // Intercept blockchain RPC calls so ownership checks work without real nodes
    setupRpcIntercepts(MOCK_REGULAR_ADDRESS);

    // Mock project API response.
    // The frontend service uses /v2/projects/{slug} while the SDK uses /projects/{slug}.
    // The pattern **/projects/{slug} matches both.
    cy.intercept("GET", `**/projects/${TEST_PROJECT_SLUG}`, (req) => {
      req.reply({
        statusCode: 200,
        body: mockProject,
      });
    }).as("getProject");

    // Also intercept the v2-specific endpoint explicitly for clarity
    cy.intercept("GET", `**/v2/projects/${TEST_PROJECT_SLUG}`, (req) => {
      req.reply({
        statusCode: 200,
        body: mockProject,
      });
    }).as("getProjectV2");

    // Mock project members/admin check
    cy.intercept("GET", `**/projects/${TEST_PROJECT_SLUG}/members`, (req) => {
      req.reply({
        statusCode: 200,
        body: [],
      });
    }).as("getProjectMembers");

    // Mock project sub-resource endpoints with properly shaped empty responses.
    // The catch-all returns [] which crashes endpoints expecting object shapes.
    cy.intercept("GET", `**/projects/${TEST_PROJECT_SLUG}/grants`, {
      statusCode: 200,
      body: [],
    }).as("getProjectGrants");

    cy.intercept("GET", `**/projects/${TEST_PROJECT_SLUG}/updates`, {
      statusCode: 200,
      body: {
        projectUpdates: [],
        projectMilestones: [],
        grantMilestones: [],
        grantUpdates: [],
      },
    }).as("getProjectUpdates");

    cy.intercept("GET", `**/projects/${TEST_PROJECT_SLUG}/impacts`, {
      statusCode: 200,
      body: [],
    }).as("getProjectImpacts");

    cy.intercept("GET", `**/projects/${TEST_PROJECT_SLUG}/contacts`, {
      statusCode: 200,
      body: [],
    }).as("getProjectContacts");

    // Mock user profile endpoint
    cy.intercept("GET", "**/user/*", {
      statusCode: 200,
      body: [],
    }).as("getUserProfiles");
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
            owner: MOCK_REGULAR_ADDRESS, // matches regular user
          },
        });
      }).as("getProjectOwner");

      // Capture console.error calls BEFORE page loads — React always logs
      // to console.error when an ErrorBoundary catches a render error.
      // This works regardless of Next.js build cache.
      cy.on("window:before:load", (win) => {
        const origError = win.console.error;
        (win as Window & { __consoleErrors?: string[] }).__consoleErrors = [];
        win.console.error = (...args: unknown[]) => {
          (win as Window & { __consoleErrors?: string[] }).__consoleErrors?.push(
            args.map((a) => (a instanceof Error ? `${a.message}\n${a.stack}` : String(a))).join(" ")
          );
          origError.apply(win.console, args);
        };
      });

      cy.visit(`/project/${TEST_PROJECT_SLUG}`);
      waitForPageLoad();

      // Wait for async rendering to complete
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(5000);

      // If ErrorBoundary fallback is visible in DOM, dump captured console errors
      cy.get("body").then(($body) => {
        const hasErrorBoundary =
          $body.find(".bg-red-50, [class*='bg-red']").length > 0 ||
          $body.text().includes("Unable to load project") ||
          $body.text().includes("Something went wrong");

        if (hasErrorBoundary) {
          cy.window().then((win) => {
            const errors = (win as Window & { __consoleErrors?: string[] }).__consoleErrors || [];
            const errorText = errors.length > 0
              ? errors.slice(0, 5).join("\n---\n")
              : "(no console.error calls captured)";
            throw new Error(
              `ErrorBoundary visible in DOM. Captured console.error calls:\n${errorText}`
            );
          });
        }
      });

      // Button should be visible for project owner
      cy.get('[data-testid="enable-donations-button"]', { timeout: 15000 }).should("be.visible");
      cy.get('[data-testid="enable-donations-button"]').should("contain", "Set up payout address");
    });

    it("should NOT show Enable Donations button when addresses are already configured", () => {
      cy.login({ userType: "regular" });

      cy.intercept("GET", `**/projects/${TEST_PROJECT_SLUG}`, (req) => {
        req.reply({
          statusCode: 200,
          body: {
            ...mockProjectWithAddresses,
            owner: MOCK_REGULAR_ADDRESS,
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
            owner: MOCK_REGULAR_ADDRESS,
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
            owner: MOCK_REGULAR_ADDRESS,
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

      cy.get('[data-testid="modal-close-button"]').click();

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
            owner: MOCK_REGULAR_ADDRESS,
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

      // Should show validation error (Cypress auto-retries until assertion passes)
      cy.get('[role="dialog"]').should("contain", "Invalid");
    });

    it("should show validation error for address without 0x prefix", () => {
      cy.visit(`/project/${TEST_PROJECT_SLUG}`);
      waitForPageLoad();

      cy.get('[data-testid="enable-donations-button"]').click();

      // Enter address without 0x
      cy.get('[role="dialog"] input[type="text"]').first().type("1234567890123456789012345678901234567890");

      // Cypress auto-retries until assertion passes
      cy.get('[role="dialog"]').should("contain", "0x");
    });

    it("should show checkmark for valid address", () => {
      cy.visit(`/project/${TEST_PROJECT_SLUG}`);
      waitForPageLoad();

      cy.get('[data-testid="enable-donations-button"]').click();

      // Enter valid address
      cy.get('[role="dialog"] input[type="text"]').first().clear().type(VALID_ADDRESS);

      // Should show checkmark (CheckIcon) - Cypress auto-retries until assertion passes
      cy.get('[role="dialog"] svg.text-green-500').should("exist");
    });

    it("should disable Save button when there are validation errors", () => {
      cy.visit(`/project/${TEST_PROJECT_SLUG}`);
      waitForPageLoad();

      cy.get('[data-testid="enable-donations-button"]').click();

      // Enter invalid address
      cy.get('[role="dialog"] input[type="text"]').first().type("invalid");

      // Save button should be disabled - Cypress auto-retries until assertion passes
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
            owner: MOCK_REGULAR_ADDRESS,
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
            owner: MOCK_REGULAR_ADDRESS,
            chainPayoutAddress: { "10": VALID_ADDRESS },
          },
        });
      }).as("getProjectRefreshed");

      cy.visit(`/project/${TEST_PROJECT_SLUG}`);
      waitForPageLoad();

      cy.get('[data-testid="enable-donations-button"]').click();

      // Enter valid address
      cy.get('[role="dialog"] input[type="text"]').first().clear().type(VALID_ADDRESS);

      // Wait for validation to complete before clicking Save
      cy.get('[role="dialog"] svg.text-green-500').should("exist");

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

      // Wait for validation to complete before clicking Save
      cy.get('[role="dialog"] svg.text-green-500').should("exist");

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
            owner: MOCK_REGULAR_ADDRESS,
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
            owner: MOCK_REGULAR_ADDRESS,
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
            owner: MOCK_REGULAR_ADDRESS,
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
