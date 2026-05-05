import { Permission } from "@/src/core/rbac/types/permission";
import type { PermissionsResponse } from "@/src/core/rbac/types/resource";
import { Role } from "@/src/core/rbac/types/role";
import { applyOverrides, type DeepPartial, randomAddress, seq } from "./utils";

// ─── Lightweight Privy-compatible types (no @privy-io/react-auth import) ───

export interface MockLinkedAccount {
  type: string;
  address?: string;
  chainType?: string;
  chainId?: string;
  walletClientType?: string;
  connectorType?: string;
  email?: string;
  verifiedAt?: Date;
  firstVerifiedAt?: Date;
  latestVerifiedAt?: Date;
  fid?: number;
  ownerAddress?: string;
  username?: string;
  displayName?: string;
  pfp?: string;
  subject?: string;
  name?: string;
}

export interface MockUser {
  id: string;
  createdAt: Date;
  linkedAccounts: MockLinkedAccount[];
  wallet?: {
    address: string;
    chainType: string;
    chainId: string;
    walletClientType: string;
    connectorType: string;
  };
  email?: {
    address: string;
  };
  farcaster?: {
    fid: number;
    ownerAddress: string;
    username: string;
    displayName: string;
    pfp: string;
  };
  google?: {
    email: string;
    subject: string;
    name: string;
  };
}

export interface MockWallet {
  address: string;
  chainId: string;
  walletClientType: string;
  connectorType: string;
  isConnected: boolean;
}

export interface MockBridgeState {
  ready: boolean;
  authenticated: boolean;
  user: MockUser | null;
  isConnected: boolean;
  address: string | undefined;
}

// ─── User factories ───

export function createMockUser(overrides?: DeepPartial<MockUser>): MockUser {
  const id = `did:privy:user-${seq()}`;
  const defaults: MockUser = {
    id,
    createdAt: new Date("2024-01-15T10:30:00Z"),
    linkedAccounts: [],
  };
  return applyOverrides(defaults, overrides);
}

export function createWalletUser(address?: string): MockUser {
  const walletAddress = address ?? randomAddress();
  return createMockUser({
    wallet: {
      address: walletAddress,
      chainType: "ethereum",
      chainId: "eip155:1",
      walletClientType: "metamask",
      connectorType: "injected",
    },
    linkedAccounts: [
      {
        type: "wallet",
        address: walletAddress,
        chainType: "ethereum",
        chainId: "eip155:1",
        walletClientType: "metamask",
        connectorType: "injected",
      },
    ],
  } as DeepPartial<MockUser>);
}

export function createEmailUser(): MockUser {
  const n = seq();
  const embeddedWallet = randomAddress();
  return createMockUser({
    email: { address: `user-${n}@karma.fund` },
    wallet: {
      address: embeddedWallet,
      chainType: "ethereum",
      chainId: "eip155:1",
      walletClientType: "privy",
      connectorType: "embedded",
    },
    linkedAccounts: [
      {
        type: "email",
        email: `user-${n}@karma.fund`,
        verifiedAt: new Date("2024-02-01T08:00:00Z"),
        firstVerifiedAt: new Date("2024-02-01T08:00:00Z"),
        latestVerifiedAt: new Date("2024-02-01T08:00:00Z"),
      },
      {
        type: "wallet",
        address: embeddedWallet,
        chainType: "ethereum",
        chainId: "eip155:1",
        walletClientType: "privy",
        connectorType: "embedded",
      },
    ],
  } as DeepPartial<MockUser>);
}

export function createFarcasterUser(): MockUser {
  const n = seq();
  const ownerAddr = randomAddress();
  return createMockUser({
    farcaster: {
      fid: 100_000 + n,
      ownerAddress: ownerAddr,
      username: `farcaster-user-${n}`,
      displayName: `Farcaster User ${n}`,
      pfp: `https://i.imgur.com/avatar-${n}.jpg`,
    },
    wallet: {
      address: ownerAddr,
      chainType: "ethereum",
      chainId: "eip155:1",
      walletClientType: "privy",
      connectorType: "embedded",
    },
    linkedAccounts: [
      {
        type: "farcaster",
        fid: 100_000 + n,
        ownerAddress: ownerAddr,
        username: `farcaster-user-${n}`,
        displayName: `Farcaster User ${n}`,
        pfp: `https://i.imgur.com/avatar-${n}.jpg`,
      },
      {
        type: "wallet",
        address: ownerAddr,
        chainType: "ethereum",
        chainId: "eip155:1",
        walletClientType: "privy",
        connectorType: "embedded",
      },
    ],
  } as DeepPartial<MockUser>);
}

export function createGoogleUser(): MockUser {
  const n = seq();
  const embeddedWallet = randomAddress();
  return createMockUser({
    google: {
      email: `user-${n}@gmail.com`,
      subject: `google-subject-${n}`,
      name: `Google User ${n}`,
    },
    wallet: {
      address: embeddedWallet,
      chainType: "ethereum",
      chainId: "eip155:1",
      walletClientType: "privy",
      connectorType: "embedded",
    },
    linkedAccounts: [
      {
        type: "google_oauth",
        email: `user-${n}@gmail.com`,
        subject: `google-subject-${n}`,
        name: `Google User ${n}`,
      },
      {
        type: "wallet",
        address: embeddedWallet,
        chainType: "ethereum",
        chainId: "eip155:1",
        walletClientType: "privy",
        connectorType: "embedded",
      },
    ],
  } as DeepPartial<MockUser>);
}

// ─── Wallet factory ───

export function createMockWallet(address?: string, type?: string): MockWallet {
  return {
    address: address ?? randomAddress(),
    chainId: "eip155:1",
    walletClientType: type ?? "metamask",
    connectorType: type === "privy" ? "embedded" : "injected",
    isConnected: true,
  };
}

// ─── Bridge state presets ───

export function createMockBridgeState(overrides?: DeepPartial<MockBridgeState>): MockBridgeState {
  const defaults: MockBridgeState = {
    ready: true,
    authenticated: false,
    user: null,
    isConnected: false,
    address: undefined,
  };
  return applyOverrides(defaults, overrides);
}

export const BRIDGE_ANONYMOUS: MockBridgeState = {
  ready: true,
  authenticated: false,
  user: null,
  isConnected: false,
  address: undefined,
};

export function BRIDGE_WALLET_AUTH(address?: string): MockBridgeState {
  const addr = address ?? randomAddress();
  return {
    ready: true,
    authenticated: true,
    user: createWalletUser(addr),
    isConnected: true,
    address: addr,
  };
}

export function BRIDGE_EMAIL_AUTH(): MockBridgeState {
  const user = createEmailUser();
  return {
    ready: true,
    authenticated: true,
    user,
    isConnected: true,
    address: user.wallet?.address,
  };
}

export function BRIDGE_FARCASTER_AUTH(): MockBridgeState {
  const user = createFarcasterUser();
  return {
    ready: true,
    authenticated: true,
    user,
    isConnected: true,
    address: user.wallet?.address,
  };
}

// ─── Permissions response factory ───

const GUEST_PERMISSIONS: Permission[] = [
  Permission.COMMUNITY_VIEW,
  Permission.PROGRAM_VIEW,
  Permission.REGISTRY_VIEW,
];

const APPLICANT_PERMISSIONS: Permission[] = [
  ...GUEST_PERMISSIONS,
  Permission.APPLICATION_CREATE,
  Permission.APPLICATION_VIEW_OWN,
  Permission.APPLICATION_EDIT_OWN,
  Permission.MILESTONE_VIEW_OWN,
  Permission.MILESTONE_SUBMIT,
];

const REVIEWER_PERMISSIONS: Permission[] = [
  ...APPLICANT_PERMISSIONS,
  Permission.APPLICATION_VIEW_ASSIGNED,
  Permission.APPLICATION_REVIEW,
  Permission.APPLICATION_COMMENT,
  Permission.MILESTONE_VIEW_ASSIGNED,
  Permission.MILESTONE_REVIEW,
  Permission.REVIEW_CREATE,
  Permission.REVIEW_EDIT_OWN,
  Permission.REVIEW_VIEW_ALL,
];

const COMMUNITY_ADMIN_PERMISSIONS: Permission[] = [
  ...REVIEWER_PERMISSIONS,
  Permission.COMMUNITY_EDIT,
  Permission.COMMUNITY_MANAGE_MEMBERS,
  Permission.COMMUNITY_MANAGE_PROGRAMS,
  Permission.APPLICATION_VIEW_ALL,
  Permission.APPLICATION_APPROVE,
  Permission.APPLICATION_REJECT,
  Permission.APPLICATION_CHANGE_STATUS,
  Permission.MILESTONE_VIEW_ALL,
  Permission.MILESTONE_APPROVE,
  Permission.MILESTONE_REJECT,
  Permission.PROGRAM_EDIT,
  Permission.PROGRAM_MANAGE_REVIEWERS,
  Permission.PROGRAM_VIEW_ANALYTICS,
  Permission.PROGRAM_MANAGE_ADMINS,
];

const PROGRAM_ADMIN_PERMISSIONS: Permission[] = [
  ...REVIEWER_PERMISSIONS,
  Permission.APPLICATION_VIEW_ALL,
  Permission.APPLICATION_APPROVE,
  Permission.APPLICATION_REJECT,
  Permission.APPLICATION_CHANGE_STATUS,
  Permission.MILESTONE_VIEW_ALL,
  Permission.MILESTONE_APPROVE,
  Permission.MILESTONE_REJECT,
  Permission.PROGRAM_EDIT,
  Permission.PROGRAM_MANAGE_REVIEWERS,
  Permission.PROGRAM_VIEW_ANALYTICS,
];

const SUPER_ADMIN_PERMISSIONS: Permission[] = Object.values(Permission);

export function createPermissionsResponse(
  overrides?: Partial<PermissionsResponse>
): PermissionsResponse {
  const defaults: PermissionsResponse = {
    roles: {
      primaryRole: Role.GUEST,
      roles: [Role.GUEST],
      reviewerTypes: [],
    },
    permissions: GUEST_PERMISSIONS,
    resourceContext: {},
    isCommunityAdmin: false,
    isProgramAdmin: false,
    isReviewer: false,
    isRegistryAdmin: false,
    isProgramCreator: false,
  };
  return overrides ? { ...defaults, ...overrides } : defaults;
}

// ─── Role presets ───

export function guestPermissions(): PermissionsResponse {
  return createPermissionsResponse();
}

export function applicantPermissions(): PermissionsResponse {
  return createPermissionsResponse({
    roles: { primaryRole: Role.APPLICANT, roles: [Role.APPLICANT], reviewerTypes: [] },
    permissions: APPLICANT_PERMISSIONS,
  });
}

export function reviewerPermissions(): PermissionsResponse {
  return createPermissionsResponse({
    roles: {
      primaryRole: Role.PROGRAM_REVIEWER,
      roles: [Role.PROGRAM_REVIEWER],
      reviewerTypes: [],
    },
    permissions: REVIEWER_PERMISSIONS,
    isReviewer: true,
  });
}

export function communityAdminPermissions(): PermissionsResponse {
  return createPermissionsResponse({
    roles: { primaryRole: Role.COMMUNITY_ADMIN, roles: [Role.COMMUNITY_ADMIN], reviewerTypes: [] },
    permissions: COMMUNITY_ADMIN_PERMISSIONS,
    isCommunityAdmin: true,
  });
}

export function programAdminPermissions(): PermissionsResponse {
  return createPermissionsResponse({
    roles: { primaryRole: Role.PROGRAM_ADMIN, roles: [Role.PROGRAM_ADMIN], reviewerTypes: [] },
    permissions: PROGRAM_ADMIN_PERMISSIONS,
    isProgramAdmin: true,
  });
}

export function superAdminPermissions(): PermissionsResponse {
  return createPermissionsResponse({
    roles: { primaryRole: Role.SUPER_ADMIN, roles: [Role.SUPER_ADMIN], reviewerTypes: [] },
    permissions: SUPER_ADMIN_PERMISSIONS,
    isCommunityAdmin: true,
    isProgramAdmin: true,
    isReviewer: true,
    isRegistryAdmin: true,
    isProgramCreator: true,
  });
}
