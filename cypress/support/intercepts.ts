/**
 * API Intercept Helpers
 * Replace cy.wait(ms) with proper API intercepts
 */

/**
 * Set up common API intercepts for most test scenarios
 */
export const setupCommonIntercepts = (): void => {
  // Projects
  cy.intercept("GET", "**/projects/**").as("getProjects");
  cy.intercept("GET", "**/projects/list**").as("getProjectsList");
  cy.intercept("GET", "**/v2/projects/**").as("getProjectV2");

  // Communities
  cy.intercept("GET", "**/community/**").as("getCommunity");
  cy.intercept("GET", "**/communities/**").as("getCommunities");

  // Grants
  cy.intercept("GET", "**/grants/**").as("getGrants");
  cy.intercept("GET", "**/projects/*/grants").as("getProjectGrants");

  // Funding
  cy.intercept("GET", "**/v2/funding-program-configs/**").as("getFundingPrograms");
  cy.intercept("GET", "**/v2/funding-program-configs/enabled").as("getEnabledPrograms");

  // Search
  cy.intercept("GET", "**/search**").as("search");

  // User
  cy.intercept("GET", "**/user/**").as("getUser");
};

/**
 * Set up intercepts specific to donation flows
 */
export const setupDonationIntercepts = (): void => {
  setupCommonIntercepts();

  cy.intercept("GET", "**/donate/**").as("getDonateInfo");
  cy.intercept("POST", "**/donate/**").as("postDonate");
};

/**
 * Set up intercepts for funding map page
 */
export const setupFundingMapIntercepts = (): void => {
  cy.intercept("GET", "**/v2/funding-program-configs/**").as("getFundingPrograms");
  cy.intercept("GET", "**/funding-map**").as("getFundingMap");
  // Stub external image requests that may 404 and block the page load event
  cy.intercept("GET", "https://pbs.twimg.com/**", { statusCode: 200, body: "" });
};

/**
 * Wait for page to be fully loaded
 */
export const waitForPageLoad = (): void => {
  cy.get("body").should("be.visible");
  cy.get("nav").should("exist");
};

/**
 * Wait for navbar to be fully hydrated and interactive
 * This is useful for tests that interact with navbar elements
 * which may not be immediately available after initial render
 */
export const waitForNavbarHydration = (): void => {
  // Wait for nav to be visible
  cy.get("nav").should("be.visible");
  // Wait for at least one interactive element in the navbar
  // The "Explore" dropdown is always present regardless of auth state
  cy.get("nav").find("button").should("have.length.at.least", 1);
};

/**
 * Wait for projects list to load
 */
export const waitForProjectsLoad = (): void => {
  cy.wait("@getProjectsList", { timeout: 15000 });
};

/**
 * Wait for a single project to load
 */
export const waitForProjectLoad = (): void => {
  cy.wait("@getProjects", { timeout: 15000 });
};

/**
 * Wait for community page to load
 */
export const waitForCommunityLoad = (): void => {
  cy.wait("@getCommunity", { timeout: 15000 });
};

/**
 * Wait for search results to appear
 */
export const waitForSearchResults = (): void => {
  cy.wait("@search", { timeout: 10000 });
};

/**
 * Wait for funding programs to load
 */
export const waitForFundingPrograms = (): void => {
  cy.wait("@getFundingPrograms", { timeout: 15000 });
};

/**
 * Wait for grants to load
 */
export const waitForGrants = (): void => {
  cy.wait("@getProjectGrants", { timeout: 15000 });
};

/**
 * ABI-encoded `true` (bool) — used as the return value for eth_call
 * responses that should return true (e.g., isOwner, isAdmin).
 */
const ABI_ENCODED_TRUE =
  "0x0000000000000000000000000000000000000000000000000000000000000001";

/**
 * ABI-encoded `false` (bool).
 */
const ABI_ENCODED_FALSE =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

/**
 * Intercept blockchain JSON-RPC calls (eth_call, eth_chainId, etc.)
 * so E2E tests don't need real RPC connectivity.
 *
 * @param ownerAddress - Address to treat as the contract/project owner.
 *   When an `eth_call` includes this address in its `data` field, the
 *   response will return `true` (ABI-encoded). All other `eth_call`s
 *   return `false`.
 */
export const setupRpcIntercepts = (ownerAddress?: string): void => {
  // Normalize for hex comparison (lowercase, no 0x, no zero-padding)
  const normalizedOwner = ownerAddress?.toLowerCase().replace("0x", "");

  cy.intercept("POST", "**", (req) => {
    // Only intercept JSON-RPC requests (ethers.js / viem)
    const body = req.body;
    if (!body?.jsonrpc && !body?.method) return;

    const method = body.method;

    if (method === "eth_chainId") {
      req.reply({
        statusCode: 200,
        body: { jsonrpc: "2.0", id: body.id, result: "0xa" }, // Optimism (10)
      });
      return;
    }

    if (method === "eth_blockNumber") {
      req.reply({
        statusCode: 200,
        body: { jsonrpc: "2.0", id: body.id, result: "0x1000000" },
      });
      return;
    }

    if (method === "net_version") {
      req.reply({
        statusCode: 200,
        body: { jsonrpc: "2.0", id: body.id, result: "10" },
      });
      return;
    }

    if (method === "eth_call") {
      // Check if the call data contains the owner address (isOwner/isAdmin checks)
      const callData: string = body.params?.[0]?.data || "";
      const containsOwner =
        normalizedOwner && callData.toLowerCase().includes(normalizedOwner);

      req.reply({
        statusCode: 200,
        body: {
          jsonrpc: "2.0",
          id: body.id,
          result: containsOwner ? ABI_ENCODED_TRUE : ABI_ENCODED_FALSE,
        },
      });
      return;
    }

    // For any other JSON-RPC method, let it pass through or return a generic success
    if (method?.startsWith("eth_") || method?.startsWith("net_")) {
      req.reply({
        statusCode: 200,
        body: { jsonrpc: "2.0", id: body.id, result: ABI_ENCODED_FALSE },
      });
      return;
    }
  }).as("rpcCalls");
};

// Add to Cypress namespace
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Set up common API intercepts
       */
      setupCommonIntercepts(): Chainable<void>;

      /**
       * Set up donation-specific intercepts
       */
      setupDonationIntercepts(): Chainable<void>;

      /**
       * Set up funding map intercepts
       */
      setupFundingMapIntercepts(): Chainable<void>;
    }
  }
}

Cypress.Commands.add("setupCommonIntercepts", setupCommonIntercepts);
Cypress.Commands.add("setupDonationIntercepts", setupDonationIntercepts);
Cypress.Commands.add("setupFundingMapIntercepts", setupFundingMapIntercepts);

