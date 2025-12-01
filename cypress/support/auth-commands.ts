/**
 * Authentication Commands for E2E Testing
 * Uses mock authentication to simulate logged-in states
 */

export type UserType = "regular" | "admin" | "reviewer" | "community-admin";

interface MockUser {
  address: string;
  token: string;
  userType: UserType;
}

const MOCK_USERS: Record<UserType, MockUser> = {
  regular: {
    address: "0x1234567890123456789012345678901234567890",
    token: "mock-token-regular",
    userType: "regular",
  },
  admin: {
    address: "0xADMIN4567890123456789012345678901234567890",
    token: "mock-token-admin",
    userType: "admin",
  },
  reviewer: {
    address: "0xREVIEW567890123456789012345678901234567890",
    token: "mock-token-reviewer",
    userType: "reviewer",
  },
  "community-admin": {
    address: "0xCOMMUNITY0123456789012345678901234567890",
    token: "mock-token-community-admin",
    userType: "community-admin",
  },
};

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Mock login as a specific user type
       * @param options.userType - Type of user to login as
       */
      login(options?: { userType?: UserType }): Chainable<void>;

      /**
       * Logout and clear authentication state
       */
      logout(): Chainable<void>;

      /**
       * Check if user is authenticated
       */
      isAuthenticated(): Chainable<boolean>;
    }
  }
}

Cypress.Commands.add("login", (options = {}) => {
  const { userType = "regular" } = options;
  const mockUser = MOCK_USERS[userType];

  cy.log(`Logging in as ${userType} user`);

  // Set up localStorage to simulate Privy auth state
  cy.window().then((win) => {
    // Mock Privy authentication state
    const authState = {
      authenticated: true,
      user: {
        id: `did:privy:${mockUser.address}`,
        wallet: {
          address: mockUser.address,
          chainId: 10, // Optimism
        },
      },
      ready: true,
    };

    win.localStorage.setItem("privy:auth_state", JSON.stringify(authState));
    win.localStorage.setItem("privy:token", mockUser.token);
  });

  // Intercept auth-related API calls
  cy.intercept("GET", "**/user/**", (req) => {
    req.reply({
      statusCode: 200,
      body: {
        address: mockUser.address,
        isAdmin: userType === "admin",
        isReviewer: userType === "reviewer",
        isCommunityAdmin: userType === "community-admin",
      },
    });
  }).as("getUser");

  cy.intercept("GET", "**/auth/staff/authorized", (req) => {
    req.reply({
      statusCode: userType === "admin" ? 200 : 403,
      body:
        userType === "admin"
          ? { authorized: true }
          : { error: "Not authorized" },
    });
  }).as("checkStaff");

  // Intercept grantees/communities/admin for community admins
  cy.intercept("GET", "**/grantees/*/communities/admin", (req) => {
    req.reply({
      statusCode: 200,
      body:
        userType === "community-admin" ? [{ slug: "test-community" }] : [],
    });
  }).as("getCommunityAdmin");

  // Intercept reviewer programs
  cy.intercept("GET", "**/v2/funding-program-configs/my-reviewer-programs", (req) => {
    req.reply({
      statusCode: 200,
      body: userType === "reviewer" ? [{ id: "test-program" }] : [],
    });
  }).as("getReviewerPrograms");
});

Cypress.Commands.add("logout", () => {
  cy.log("Logging out");

  cy.window().then((win) => {
    win.localStorage.removeItem("privy:auth_state");
    win.localStorage.removeItem("privy:token");
  });

  cy.clearCookies();
});

Cypress.Commands.add("isAuthenticated", () => {
  return cy.window().then((win) => {
    const authState = win.localStorage.getItem("privy:auth_state");
    if (!authState) return false;

    try {
      const parsed = JSON.parse(authState);
      return parsed.authenticated === true;
    } catch {
      return false;
    }
  });
});

