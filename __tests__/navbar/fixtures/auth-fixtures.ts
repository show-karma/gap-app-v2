/**
 * Authentication fixtures for navbar testing
 * Provides all permission combinations for comprehensive testing
 */

import type { FundingProgram } from "@/services/fundingPlatformService"

export interface MockAuthState {
  ready: boolean
  authenticated: boolean
  isConnected: boolean
  address?: string
  user?: {
    id: string
    wallet?: {
      address: string
    }
  }
}

export interface MockPermissionsState {
  // Communities Store
  communities: Array<{
    uid: string
    details?: {
      name: string
      imageURL: string
    }
  }>

  // Reviewer Programs
  reviewerPrograms: FundingProgram[]

  // Staff & Owner
  isStaff: boolean
  isOwner: boolean

  // Registry
  isPoolManager: boolean
  isRegistryAdmin: boolean
}

export interface AuthFixture {
  name: string
  description: string
  authState: MockAuthState
  permissions: MockPermissionsState
  expectedElements: {
    signIn: boolean
    contactSales: boolean
    resources: boolean
    userMenu: boolean
    myProjects: boolean
    review: boolean
    admin: boolean
    managePrograms: boolean
  }
}

// Helper: Create mock funding program
export const createMockProgram = (overrides: any = {}): any => ({
  uid: overrides.uid || "test-program-1",
  metadata: {
    title: overrides.metadata?.title || "Test Program",
    description: overrides.metadata?.description || "Test program description",
  },
  communityUID: overrides.communityUID || "test-community-1",
  chainID: overrides.chainID || 42161,
  status: "active",
  ...overrides,
})

// Helper: Create mock community
export const createMockCommunity = (uid: string, name: string) => ({
  uid,
  details: {
    name,
    imageURL: `https://example.com/${uid}.png`,
  },
})

/**
 * All authentication and permission scenarios
 */
export const authFixtures: AuthFixture[] = [
  // 1. Unauthenticated User
  {
    name: "unauthenticated",
    description: "User is not logged in",
    authState: {
      ready: true,
      authenticated: false,
      isConnected: false,
    },
    permissions: {
      communities: [],
      reviewerPrograms: [],
      isStaff: false,
      isOwner: false,
      isPoolManager: false,
      isRegistryAdmin: false,
    },
    expectedElements: {
      signIn: true,
      contactSales: true,
      resources: true,
      userMenu: false,
      myProjects: false,
      review: false,
      admin: false,
      managePrograms: false,
    },
  },

  // 2. Basic Authenticated User
  {
    name: "authenticated-basic",
    description: "Authenticated user with no special permissions",
    authState: {
      ready: true,
      authenticated: true,
      isConnected: true,
      address: "0x1234567890123456789012345678901234567890",
      user: {
        id: "user-1",
        wallet: {
          address: "0x1234567890123456789012345678901234567890",
        },
      },
    },
    permissions: {
      communities: [],
      reviewerPrograms: [],
      isStaff: false,
      isOwner: false,
      isPoolManager: false,
      isRegistryAdmin: false,
    },
    expectedElements: {
      signIn: false,
      contactSales: false,
      resources: false,
      userMenu: true,
      myProjects: true,
      review: false,
      admin: false,
      managePrograms: false,
    },
  },

  // 3. Community Admin (1 community)
  {
    name: "community-admin-single",
    description: "Admin of one community",
    authState: {
      ready: true,
      authenticated: true,
      isConnected: true,
      address: "0x2234567890123456789012345678901234567890",
    },
    permissions: {
      communities: [createMockCommunity("community-1", "Test Community")],
      reviewerPrograms: [],
      isStaff: false,
      isOwner: false,
      isPoolManager: false,
      isRegistryAdmin: false,
    },
    expectedElements: {
      signIn: false,
      contactSales: false,
      resources: false,
      userMenu: true,
      myProjects: true,
      review: false,
      admin: true,
      managePrograms: false,
    },
  },

  // 4. Community Admin (Multiple communities)
  {
    name: "community-admin-multiple",
    description: "Admin of multiple communities",
    authState: {
      ready: true,
      authenticated: true,
      isConnected: true,
      address: "0x3234567890123456789012345678901234567890",
    },
    permissions: {
      communities: [
        createMockCommunity("community-1", "Test Community 1"),
        createMockCommunity("community-2", "Test Community 2"),
        createMockCommunity("community-3", "Test Community 3"),
      ],
      reviewerPrograms: [],
      isStaff: false,
      isOwner: false,
      isPoolManager: false,
      isRegistryAdmin: false,
    },
    expectedElements: {
      signIn: false,
      contactSales: false,
      resources: false,
      userMenu: true,
      myProjects: true,
      review: false,
      admin: true,
      managePrograms: false,
    },
  },

  // 5. Reviewer (1 program)
  {
    name: "reviewer-single",
    description: "Reviewer for one program",
    authState: {
      ready: true,
      authenticated: true,
      isConnected: true,
      address: "0x4234567890123456789012345678901234567890",
    },
    permissions: {
      communities: [],
      reviewerPrograms: [createMockProgram()],
      isStaff: false,
      isOwner: false,
      isPoolManager: false,
      isRegistryAdmin: false,
    },
    expectedElements: {
      signIn: false,
      contactSales: false,
      resources: false,
      userMenu: true,
      myProjects: true,
      review: true,
      admin: false,
      managePrograms: false,
    },
  },

  // 6. Reviewer (Multiple programs)
  {
    name: "reviewer-multiple",
    description: "Reviewer for multiple programs",
    authState: {
      ready: true,
      authenticated: true,
      isConnected: true,
      address: "0x5234567890123456789012345678901234567890",
    },
    permissions: {
      communities: [],
      reviewerPrograms: [
        createMockProgram({
          uid: "program-1",
          metadata: { title: "Program 1", description: "Desc 1" },
        }),
        createMockProgram({
          uid: "program-2",
          metadata: { title: "Program 2", description: "Desc 2" },
        }),
        createMockProgram({
          uid: "program-3",
          metadata: { title: "Program 3", description: "Desc 3" },
        }),
      ],
      isStaff: false,
      isOwner: false,
      isPoolManager: false,
      isRegistryAdmin: false,
    },
    expectedElements: {
      signIn: false,
      contactSales: false,
      resources: false,
      userMenu: true,
      myProjects: true,
      review: true,
      admin: false,
      managePrograms: false,
    },
  },

  // 7. Staff Member
  {
    name: "staff",
    description: "Staff member with admin access",
    authState: {
      ready: true,
      authenticated: true,
      isConnected: true,
      address: "0x6234567890123456789012345678901234567890",
    },
    permissions: {
      communities: [],
      reviewerPrograms: [],
      isStaff: true,
      isOwner: false,
      isPoolManager: false,
      isRegistryAdmin: false,
    },
    expectedElements: {
      signIn: false,
      contactSales: false,
      resources: false,
      userMenu: true,
      myProjects: true,
      review: false,
      admin: true,
      managePrograms: false,
    },
  },

  // 8. Owner
  {
    name: "owner",
    description: "Platform owner with admin access",
    authState: {
      ready: true,
      authenticated: true,
      isConnected: true,
      address: "0x7234567890123456789012345678901234567890",
    },
    permissions: {
      communities: [],
      reviewerPrograms: [],
      isStaff: false,
      isOwner: true,
      isPoolManager: false,
      isRegistryAdmin: false,
    },
    expectedElements: {
      signIn: false,
      contactSales: false,
      resources: false,
      userMenu: true,
      myProjects: true,
      review: false,
      admin: true,
      managePrograms: false,
    },
  },

  // 9. Pool Manager
  {
    name: "pool-manager",
    description: "Registry pool manager",
    authState: {
      ready: true,
      authenticated: true,
      isConnected: true,
      address: "0x8234567890123456789012345678901234567890",
    },
    permissions: {
      communities: [],
      reviewerPrograms: [],
      isStaff: false,
      isOwner: false,
      isPoolManager: true,
      isRegistryAdmin: false,
    },
    expectedElements: {
      signIn: false,
      contactSales: false,
      resources: false,
      userMenu: true,
      myProjects: true,
      review: false,
      admin: false,
      managePrograms: true,
    },
  },

  // 10. Registry Admin
  {
    name: "registry-admin",
    description: "Registry administrator",
    authState: {
      ready: true,
      authenticated: true,
      isConnected: true,
      address: "0x9234567890123456789012345678901234567890",
    },
    permissions: {
      communities: [],
      reviewerPrograms: [],
      isStaff: false,
      isOwner: false,
      isPoolManager: false,
      isRegistryAdmin: true,
    },
    expectedElements: {
      signIn: false,
      contactSales: false,
      resources: false,
      userMenu: true,
      myProjects: true,
      review: false,
      admin: false,
      managePrograms: true,
    },
  },

  // 11. Community Admin + Reviewer
  {
    name: "admin-and-reviewer",
    description: "Community admin who is also a reviewer",
    authState: {
      ready: true,
      authenticated: true,
      isConnected: true,
      address: "0xa234567890123456789012345678901234567890",
    },
    permissions: {
      communities: [createMockCommunity("community-1", "Test Community")],
      reviewerPrograms: [createMockProgram()],
      isStaff: false,
      isOwner: false,
      isPoolManager: false,
      isRegistryAdmin: false,
    },
    expectedElements: {
      signIn: false,
      contactSales: false,
      resources: false,
      userMenu: true,
      myProjects: true,
      review: true,
      admin: true,
      managePrograms: false,
    },
  },

  // 12. Staff + Reviewer
  {
    name: "staff-and-reviewer",
    description: "Staff member who is also a reviewer",
    authState: {
      ready: true,
      authenticated: true,
      isConnected: true,
      address: "0xb234567890123456789012345678901234567890",
    },
    permissions: {
      communities: [],
      reviewerPrograms: [createMockProgram()],
      isStaff: true,
      isOwner: false,
      isPoolManager: false,
      isRegistryAdmin: false,
    },
    expectedElements: {
      signIn: false,
      contactSales: false,
      resources: false,
      userMenu: true,
      myProjects: true,
      review: true,
      admin: true,
      managePrograms: false,
    },
  },

  // 13. Registry Admin + Community Admin
  {
    name: "registry-admin-and-community-admin",
    description: "Registry admin who is also a community admin",
    authState: {
      ready: true,
      authenticated: true,
      isConnected: true,
      address: "0xc234567890123456789012345678901234567890",
    },
    permissions: {
      communities: [createMockCommunity("community-1", "Test Community")],
      reviewerPrograms: [],
      isStaff: false,
      isOwner: false,
      isPoolManager: false,
      isRegistryAdmin: true,
    },
    expectedElements: {
      signIn: false,
      contactSales: false,
      resources: false,
      userMenu: true,
      myProjects: true,
      review: false,
      admin: true,
      managePrograms: true,
    },
  },

  // 14. All Permissions Combined
  {
    name: "super-user",
    description: "User with all possible permissions",
    authState: {
      ready: true,
      authenticated: true,
      isConnected: true,
      address: "0xd234567890123456789012345678901234567890",
    },
    permissions: {
      communities: [createMockCommunity("community-1", "Test Community")],
      reviewerPrograms: [createMockProgram()],
      isStaff: true,
      isOwner: true,
      isPoolManager: true,
      isRegistryAdmin: true,
    },
    expectedElements: {
      signIn: false,
      contactSales: false,
      resources: false,
      userMenu: true,
      myProjects: true,
      review: true,
      admin: true,
      managePrograms: true,
    },
  },

  // 15. Loading State
  {
    name: "loading",
    description: "Authentication is loading (ready = false)",
    authState: {
      ready: false,
      authenticated: false,
      isConnected: false,
    },
    permissions: {
      communities: [],
      reviewerPrograms: [],
      isStaff: false,
      isOwner: false,
      isPoolManager: false,
      isRegistryAdmin: false,
    },
    expectedElements: {
      signIn: false,
      contactSales: false,
      resources: false,
      userMenu: false,
      myProjects: false,
      review: false,
      admin: false,
      managePrograms: false,
    },
  },
]

/**
 * Get a specific fixture by name
 */
export const getAuthFixture = (name: string): AuthFixture => {
  const fixture = authFixtures.find((f) => f.name === name)
  if (!fixture) {
    throw new Error(`Auth fixture "${name}" not found`)
  }
  return fixture
}

/**
 * Get all fixtures matching certain criteria
 */
export const getAuthFixturesBy = (predicate: (fixture: AuthFixture) => boolean): AuthFixture[] => {
  return authFixtures.filter(predicate)
}

/**
 * Helper: Get authenticated fixtures
 */
export const getAuthenticatedFixtures = (): AuthFixture[] => {
  return getAuthFixturesBy((f) => f.authState.authenticated)
}

/**
 * Helper: Get unauthenticated fixtures
 */
export const getUnauthenticatedFixtures = (): AuthFixture[] => {
  return getAuthFixturesBy((f) => !f.authState.authenticated)
}
