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
 * localStorage is set on the correct origin via cy.visit({ onBeforeLoad }),
 * and useAuth() reads it when running under Cypress. Blockchain RPC calls
 * (isOwner, isAdmin) are intercepted via setupRpcIntercepts().
 */

import { setupIndexerCatchAll, setupRpcIntercepts, waitForPageLoad } from "../../support/intercepts";
import type { UserType } from "../../support/auth-commands";

// Test data
const TEST_PROJECT_SLUG = "test-project";
const MOCK_REGULAR_ADDRESS = "0x1234567890123456789012345678901234567890";
const MOCK_ADMIN_ADDRESS = "0xADMIN4567890123456789012345678901234567890";
const VALID_ADDRESS = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed";
const VALID_ADDRESS_2 = MOCK_REGULAR_ADDRESS;

const MOCK_USERS: Record<"regular" | "admin", { address: string; token: string }> = {
  regular: { address: MOCK_REGULAR_ADDRESS, token: "mock-token-regular" },
  admin: { address: MOCK_ADMIN_ADDRESS, token: "mock-token-admin" },
};

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

/**
 * Visit a project page with optional authentication.
 *
 * Sets localStorage auth state via onBeforeLoad (correct origin),
 * and adds a cache-busting query param to force a fresh server render
 * on every visit (prevents Next.js Full Route Cache from reusing
 * stale RSC payloads between tests).
 */
const visitProject = (
  userType?: "regular" | "admin"
) => {
  const cacheBust = `_t=${Date.now()}`;
  const url = `/project/${TEST_PROJECT_SLUG}?${cacheBust}`;

  if (userType) {
    const { address, token } = MOCK_USERS[userType];
    cy.visit(url, {
      onBeforeLoad(win) {
        win.localStorage.setItem(
          "privy:auth_state",
          JSON.stringify({
            authenticated: true,
            user: {
              id: `did:privy:${address}`,
              wallet: { address, chainId: 10 },
            },
            ready: true,
          })
        );
        win.localStorage.setItem("privy:token", token);
      },
    });
  } else {
    cy.visit(url);
  }
};

/**
 * Wait for E2EStoreExposer to hydrate and expose store setters.
 */
const waitForStoreExposure = () => {
  cy.window({ timeout: 30000 }).should("have.property", "__E2E_STORES__");
};

/**
 * Wait for the ProjectProfileLayout to finish loading and render the
 * full project page. First waits for ANY layout state to appear,
 * then waits specifically for the success state.
 */
const waitForLayoutReady = () => {
  // Wait for the project-profile-layout to render (success state).
  // This confirms the component mounted and project data loaded successfully.
  cy.get('[data-testid="project-profile-layout"]', { timeout: 30000 }).should("exist");
};

/**
 * Wait for ALL project data API calls to complete.
 * useProjectProfile aggregates isLoading from project, grants, updates,
 * and impacts — all four must resolve before the layout shows the success state.
 * Without this wait, the component may stay in loading state when
 * setProjectOwnerViaStore tries to assert on project-profile-layout.
 *
 * IMPORTANT: All tests must use "@getProject" as the alias for their project
 * intercept (even when overriding the mock data), so this wait works consistently.
 */
const waitForProjectData = () => {
  cy.wait(
    ["@getProject", "@getProjectGrants", "@getProjectUpdates", "@getProjectImpacts"],
    { timeout: 15000 }
  );
};

/**
 * Set project ownership flag via the exposed Zustand store,
 * then wait for the layout to be fully rendered.
 */
const setProjectOwnerViaStore = () => {
  waitForProjectData();
  waitForStoreExposure();
  cy.window().then((win) => {
    const stores = (win as unknown as Window & { __E2E_STORES__: Record<string, (v: boolean) => void> }).__E2E_STORES__;
    stores.setIsProjectOwner(true);
    stores.setIsOwnerLoading(false);
  });
  waitForLayoutReady();
};

/**
 * Set staff/owner flags via the exposed Zustand store,
 * then wait for the layout to be fully rendered.
 */
const setStaffViaStore = () => {
  waitForProjectData();
  waitForStoreExposure();
  cy.window().then((win) => {
    const stores = (win as unknown as Window & { __E2E_STORES__: Record<string, (v: boolean) => void> }).__E2E_STORES__;
    stores.setIsOwner(true);
    stores.setIsOwnerLoading(false);
  });
  waitForLayoutReady();
};

/**
 * Register auth-related API intercepts so requests don't leak
 * to the real server. This replaces the intercept registration
 * previously done by cy.login().
 */
const setupAuthIntercepts = (userType: UserType = "regular") => {
  const isAdmin = userType === "admin";

  cy.intercept("GET", "**/auth/staff/authorized", {
    statusCode: isAdmin ? 200 : 403,
    body: isAdmin ? { authorized: true } : { error: "Not authorized" },
  }).as("checkStaff");

  cy.intercept("GET", "**/grantees/*/communities/admin", {
    statusCode: 200,
    body: [],
  }).as("getCommunityAdmin");

  cy.intercept("GET", "**/v2/funding-program-configs/my-reviewer-programs", {
    statusCode: 200,
    body: [],
  }).as("getReviewerPrograms");

  const roles = isAdmin ? ["SUPER_ADMIN"] : ["GUEST"];
  cy.intercept("GET", "**/v2/auth/permissions**", {
    statusCode: 200,
    body: {
      roles: { primaryRole: roles[0], roles, reviewerTypes: [] },
      permissions: [],
      resourceContext: {},
      isCommunityAdmin: isAdmin,
      isProgramAdmin: isAdmin,
      isReviewer: false,
      isRegistryAdmin: isAdmin,
      isProgramCreator: isAdmin,
    },
  }).as("getPermissions");
};

describe("Chain Payout Address Modal", () => {
  // Capture uncaught exceptions to prevent test failures from unrelated errors
  // (e.g., Privy SDK, third-party scripts) and log them for debugging.
  Cypress.on("uncaught:exception", (err) => {
    Cypress.log({ name: "uncaught:exception", message: err.message });
    return false;
  });

  beforeEach(() => {
    // Clear all browser storage to ensure clean state between tests.
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();
    cy.clearAllCookies();

    // Catch-all FIRST (lowest priority in Cypress LIFO matching).
    setupIndexerCatchAll();

    // Intercept blockchain RPC calls so ownership checks work without real nodes
    setupRpcIntercepts(MOCK_REGULAR_ADDRESS);

    // Auth API intercepts (prevents requests from hitting the real server)
    setupAuthIntercepts("regular");

    // Mock project API response.
    // The frontend service uses /v2/projects/{slug} while the SDK uses /projects/{slug}.
    // The pattern **/projects/{slug} matches both.
    // IMPORTANT: Tests that need different mock data should override this with the
    // SAME alias "@getProject" so that waitForProjectData() can wait for it.
    cy.intercept("GET", `**/projects/${TEST_PROJECT_SLUG}`, (req) => {
      req.reply({
        statusCode: 200,
        body: mockProject,
      });
    }).as("getProject");

    // Mock project members/admin check
    cy.intercept("GET", `**/projects/${TEST_PROJECT_SLUG}/members`, {
      statusCode: 200,
      body: [],
    }).as("getProjectMembers");

    // Mock project sub-resource endpoints with properly shaped empty responses.
    // Grants uses a wildcard (*) for the project identifier because useProjectGrants
    // re-fetches with project.uid (a hex string) after the initial slug-based fetch.
    cy.intercept("GET", "**/projects/*/grants", {
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
      // Override project mock — owner matches regular user
      cy.intercept("GET", `**/projects/${TEST_PROJECT_SLUG}`, (req) => {
        req.reply({
          statusCode: 200,
          body: { ...mockProject, owner: MOCK_REGULAR_ADDRESS },
        });
      }).as("getProject");

      visitProject("regular");
      waitForPageLoad();
      setProjectOwnerViaStore();

      cy.get('[data-testid="enable-donations-button"]', { timeout: 15000 }).should("be.visible");
      cy.get('[data-testid="enable-donations-button"]').should("contain", "Set up payout address");
    });

    it("should NOT show Enable Donations button when addresses are already configured", () => {
      cy.intercept("GET", `**/projects/${TEST_PROJECT_SLUG}`, (req) => {
        req.reply({
          statusCode: 200,
          body: { ...mockProjectWithAddresses, owner: MOCK_REGULAR_ADDRESS },
        });
      }).as("getProject");

      visitProject("regular");
      waitForPageLoad();

      cy.get('[data-testid="enable-donations-button"]').should("not.exist");
    });

    it("should NOT show Enable Donations button for non-authorized users", () => {
      visitProject(); // No auth
      waitForPageLoad();

      cy.get('[data-testid="enable-donations-button"]').should("not.exist");
    });

    it("should open modal when Enable Donations button is clicked", () => {
      cy.intercept("GET", `**/projects/${TEST_PROJECT_SLUG}`, (req) => {
        req.reply({
          statusCode: 200,
          body: { ...mockProject, owner: MOCK_REGULAR_ADDRESS },
        });
      }).as("getProject");

      visitProject("regular");
      waitForPageLoad();
      setProjectOwnerViaStore();

      cy.get('[data-testid="enable-donations-button"]').click();

      // Use data-state to target the Radix Dialog, not the chatbot widget
      cy.get('[role="dialog"][data-state="open"]').should("be.visible");
      cy.get('[role="dialog"][data-state="open"]').should("contain", "Set Payout Addresses");
    });
  });

  describe("Set Payout Address Modal", () => {
    beforeEach(() => {
      cy.intercept("GET", `**/projects/${TEST_PROJECT_SLUG}`, (req) => {
        req.reply({
          statusCode: 200,
          body: { ...mockProject, owner: MOCK_REGULAR_ADDRESS },
        });
      }).as("getProject");
    });

    it("should display all supported chains", () => {
      visitProject("regular");
      waitForPageLoad();
      setProjectOwnerViaStore();

      cy.get('[data-testid="enable-donations-button"]').click();

      // viem chain names: "OP Mainnet", "Arbitrum One", "Base"
      cy.get('[role="dialog"][data-state="open"]').should("contain", "OP Mainnet");
      cy.get('[role="dialog"][data-state="open"]').should("contain", "Base");
      cy.get('[role="dialog"][data-state="open"]').should("contain", "Arbitrum One");
    });

    it("should display chain icons", () => {
      visitProject("regular");
      waitForPageLoad();
      setProjectOwnerViaStore();

      cy.get('[data-testid="enable-donations-button"]').click();

      cy.get('[role="dialog"][data-state="open"] img').should("have.length.at.least", 1);
    });

    it("should have input fields for each chain", () => {
      visitProject("regular");
      waitForPageLoad();
      setProjectOwnerViaStore();

      cy.get('[data-testid="enable-donations-button"]').click();

      cy.get('[role="dialog"][data-state="open"] input[type="text"]').should("have.length.at.least", 1);
    });

    it("should close modal when clicking Cancel", () => {
      visitProject("regular");
      waitForPageLoad();
      setProjectOwnerViaStore();

      cy.get('[data-testid="enable-donations-button"]').click();
      cy.get('[role="dialog"][data-state="open"]').should("be.visible");

      cy.get('[role="dialog"][data-state="open"]').contains("button", "Cancel").click();

      cy.get('[role="dialog"][data-state="open"]').should("not.exist");
    });

    it("should close modal when clicking X button", () => {
      visitProject("regular");
      waitForPageLoad();
      setProjectOwnerViaStore();

      cy.get('[data-testid="enable-donations-button"]').click();
      cy.get('[role="dialog"][data-state="open"]').should("be.visible");

      cy.get('[data-testid="modal-close-button"]').click();

      cy.get('[role="dialog"][data-state="open"]').should("not.exist");
    });
  });

  describe("Form Validation", () => {
    beforeEach(() => {
      cy.intercept("GET", `**/projects/${TEST_PROJECT_SLUG}`, (req) => {
        req.reply({
          statusCode: 200,
          body: { ...mockProject, owner: MOCK_REGULAR_ADDRESS },
        });
      }).as("getProject");
    });

    it("should show validation error for invalid address format", () => {
      visitProject("regular");
      waitForPageLoad();
      setProjectOwnerViaStore();

      cy.get('[data-testid="enable-donations-button"]').click();

      // Short input triggers "Address must be 42 characters" (length check is first)
      cy.get('[role="dialog"][data-state="open"] input[type="text"]').first().type("invalid-address");

      // Validation is debounced (300ms) — Cypress retries automatically
      cy.get('[role="dialog"][data-state="open"]').should("contain", "42 characters");
    });

    it("should show validation error for address without 0x prefix", () => {
      visitProject("regular");
      waitForPageLoad();
      setProjectOwnerViaStore();

      cy.get('[data-testid="enable-donations-button"]').click();

      // 42-char string without 0x prefix to trigger the prefix validation
      cy.get('[role="dialog"][data-state="open"] input[type="text"]').first()
        .type("xx5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed");

      cy.get('[role="dialog"][data-state="open"]').should("contain", "0x");
    });

    it("should show checkmark for valid address", () => {
      visitProject("regular");
      waitForPageLoad();
      setProjectOwnerViaStore();

      cy.get('[data-testid="enable-donations-button"]').click();

      cy.get('[role="dialog"][data-state="open"] input[type="text"]').first().clear().type(VALID_ADDRESS);

      cy.get('[role="dialog"][data-state="open"] svg.text-green-500').should("exist");
    });

    it("should disable Save button when there are validation errors", () => {
      visitProject("regular");
      waitForPageLoad();
      setProjectOwnerViaStore();

      cy.get('[data-testid="enable-donations-button"]').click();

      cy.get('[role="dialog"][data-state="open"] input[type="text"]').first().type("invalid");

      cy.get('[role="dialog"][data-state="open"]').contains("button", "Save").should("be.disabled");
    });
  });

  describe("Save Operations", () => {
    beforeEach(() => {
      cy.intercept("GET", `**/projects/${TEST_PROJECT_SLUG}`, (req) => {
        req.reply({
          statusCode: 200,
          body: { ...mockProject, owner: MOCK_REGULAR_ADDRESS },
        });
      }).as("getProject");
    });

    it("should save addresses successfully", () => {
      cy.intercept("PUT", `**/v2/projects/*/chain-payout-address`, (req) => {
        req.reply({
          statusCode: 200,
          body: { chainPayoutAddress: req.body.chainPayoutAddresses },
        });
      }).as("updateChainPayoutAddress");

      visitProject("regular");
      waitForPageLoad();
      setProjectOwnerViaStore();

      cy.get('[data-testid="enable-donations-button"]').click();

      cy.get('[role="dialog"][data-state="open"] input[type="text"]').first().clear().type(VALID_ADDRESS);

      cy.get('[role="dialog"][data-state="open"] svg.text-green-500').should("exist");

      // Register post-save GET intercept AFTER initial load so LIFO doesn't
      // serve the updated data during the first page visit.
      cy.intercept("GET", `**/projects/${TEST_PROJECT_SLUG}`, (req) => {
        req.reply({
          statusCode: 200,
          body: {
            ...mockProject,
            owner: MOCK_REGULAR_ADDRESS,
            chainPayoutAddress: { "10": VALID_ADDRESS },
          },
        });
      }).as("getProject");

      cy.get('[role="dialog"][data-state="open"]').contains("button", "Save").click();

      cy.wait("@updateChainPayoutAddress");

      cy.get('[role="dialog"][data-state="open"]').should("not.exist");

      cy.get('[role="status"]').should("contain", "success");
    });

    it("should show error message on save failure", () => {
      cy.intercept("PUT", `**/v2/projects/*/chain-payout-address`, (req) => {
        req.reply({
          statusCode: 403,
          // fetchData reads err.response.data.message, not .error
          body: { message: "Access denied" },
        });
      }).as("updateChainPayoutAddressFail");

      visitProject("regular");
      waitForPageLoad();
      setProjectOwnerViaStore();

      cy.get('[data-testid="enable-donations-button"]').click();

      cy.get('[role="dialog"][data-state="open"] input[type="text"]').first().clear().type(VALID_ADDRESS);

      cy.get('[role="dialog"][data-state="open"] svg.text-green-500').should("exist");

      cy.get('[role="dialog"][data-state="open"]').contains("button", "Save").click();

      cy.wait("@updateChainPayoutAddressFail");

      cy.get('[role="dialog"][data-state="open"]').should("be.visible");

      cy.get('[role="dialog"][data-state="open"] [role="alert"]').should("be.visible");
      cy.get('[role="dialog"][data-state="open"] [role="alert"]').should("contain", "Access denied");
    });

    it("should show 'No changes to save' when nothing changed", () => {
      cy.intercept("GET", `**/projects/${TEST_PROJECT_SLUG}`, (req) => {
        req.reply({
          statusCode: 200,
          body: { ...mockProjectWithAddresses, owner: MOCK_REGULAR_ADDRESS },
        });
      }).as("getProject");

      visitProject("regular");
      waitForPageLoad();
      setProjectOwnerViaStore();

      // Open from menu since Enable Donations won't show.
      // Filter to visible to avoid desktop+mobile duplicate.
      cy.get('[data-testid="project-options-menu"]').filter(':visible').first().click();
      cy.contains("Set Payout Address").click();

      cy.get('[role="dialog"][data-state="open"]').contains("button", "Update").click();

      cy.get('[role="status"]').should("contain", "No changes");
    });
  });

  describe("Menu Access", () => {
    it("should show Set Payout Address in options menu for project owner", () => {
      cy.intercept("GET", `**/projects/${TEST_PROJECT_SLUG}`, (req) => {
        req.reply({
          statusCode: 200,
          body: { ...mockProjectWithAddresses, owner: MOCK_REGULAR_ADDRESS },
        });
      }).as("getProject");

      visitProject("regular");
      waitForPageLoad();
      setProjectOwnerViaStore();

      cy.get('[data-testid="project-options-menu"]').filter(':visible').first().click();

      cy.contains("Set Payout Address").should("be.visible");
    });

    it("should open modal from menu", () => {
      cy.intercept("GET", `**/projects/${TEST_PROJECT_SLUG}`, (req) => {
        req.reply({
          statusCode: 200,
          body: { ...mockProjectWithAddresses, owner: MOCK_REGULAR_ADDRESS },
        });
      }).as("getProject");

      visitProject("regular");
      waitForPageLoad();
      setProjectOwnerViaStore();

      cy.get('[data-testid="project-options-menu"]').filter(':visible').first().click();
      cy.contains("Set Payout Address").click();

      cy.get('[role="dialog"][data-state="open"]').should("be.visible");
      cy.get('[role="dialog"][data-state="open"]').should("contain", "Manage Payout Addresses");

      // Chain 10 (OP Mainnet) has VALID_ADDRESS set in mockProjectWithAddresses
      cy.get('[role="dialog"][data-state="open"] #address-10').should("have.value", VALID_ADDRESS);
    });

    it("should NOT show Set Payout Address in menu for non-authorized users", () => {
      visitProject(); // No auth
      waitForPageLoad();

      cy.get('[data-testid="project-options-menu"]').should("not.exist");
    });
  });

  describe("Staff Access", () => {
    it("should allow staff to see and use Enable Donations button", () => {
      // Override auth intercepts for admin
      setupAuthIntercepts("admin");
      // Override RPC intercepts for admin address
      setupRpcIntercepts(MOCK_ADMIN_ADDRESS);

      cy.intercept("GET", `**/projects/${TEST_PROJECT_SLUG}`, (req) => {
        req.reply({
          statusCode: 200,
          body: mockProject, // No chainPayoutAddress, not owner
        });
      }).as("getProject");

      visitProject("admin");
      waitForPageLoad();
      setStaffViaStore();

      cy.get('[data-testid="enable-donations-button"]').should("be.visible");
    });

    it("should allow staff to access Set Payout Address from menu", () => {
      // Override auth intercepts for admin
      setupAuthIntercepts("admin");
      setupRpcIntercepts(MOCK_ADMIN_ADDRESS);

      cy.intercept("GET", `**/projects/${TEST_PROJECT_SLUG}`, (req) => {
        req.reply({
          statusCode: 200,
          body: mockProjectWithAddresses,
        });
      }).as("getProject");

      visitProject("admin");
      waitForPageLoad();
      setStaffViaStore();

      cy.get('[data-testid="project-options-menu"]').filter(':visible').first().click();
      cy.contains("Set Payout Address").should("be.visible");
    });
  });
});
