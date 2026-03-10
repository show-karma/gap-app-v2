export interface PermissionsApiResponse {
  roles: {
    primaryRole: string;
    roles: string[];
    reviewerTypes?: string[];
  };
  permissions: string[];
  resourceContext: Record<string, string | undefined>;
  isCommunityAdmin: boolean;
  isProgramAdmin: boolean;
  isReviewer: boolean;
  isRegistryAdmin: boolean;
  isProgramCreator: boolean;
}

const SUPER_ADMIN_RESPONSE: PermissionsApiResponse = {
  roles: {
    primaryRole: "SUPER_ADMIN",
    roles: ["SUPER_ADMIN"],
  },
  permissions: ["*"],
  resourceContext: {},
  isCommunityAdmin: true,
  isProgramAdmin: true,
  isReviewer: true,
  isRegistryAdmin: true,
  isProgramCreator: true,
};

const REGISTRY_ADMIN_RESPONSE: PermissionsApiResponse = {
  roles: {
    primaryRole: "REGISTRY_ADMIN",
    roles: ["REGISTRY_ADMIN"],
  },
  permissions: ["registry:*", "community:view", "program:view"],
  resourceContext: {},
  isCommunityAdmin: false,
  isProgramAdmin: false,
  isReviewer: false,
  isRegistryAdmin: true,
  isProgramCreator: false,
};

const COMMUNITY_ADMIN_RESPONSE: PermissionsApiResponse = {
  roles: {
    primaryRole: "COMMUNITY_ADMIN",
    roles: ["COMMUNITY_ADMIN"],
  },
  permissions: ["community:*", "program:*", "application:view_all"],
  resourceContext: {},
  isCommunityAdmin: true,
  isProgramAdmin: false,
  isReviewer: false,
  isRegistryAdmin: false,
  isProgramCreator: false,
};

const PROGRAM_ADMIN_RESPONSE: PermissionsApiResponse = {
  roles: {
    primaryRole: "PROGRAM_ADMIN",
    roles: ["PROGRAM_ADMIN"],
  },
  permissions: ["program:*", "application:view_all"],
  resourceContext: {},
  isCommunityAdmin: false,
  isProgramAdmin: true,
  isReviewer: false,
  isRegistryAdmin: false,
  isProgramCreator: false,
};

const PROGRAM_REVIEWER_RESPONSE: PermissionsApiResponse = {
  roles: {
    primaryRole: "PROGRAM_REVIEWER",
    roles: ["PROGRAM_REVIEWER"],
    reviewerTypes: ["PROGRAM"],
  },
  permissions: [
    "application:view_assigned",
    "application:comment",
    "review:create",
    "review:edit_own",
  ],
  resourceContext: {},
  isCommunityAdmin: false,
  isProgramAdmin: false,
  isReviewer: true,
  isRegistryAdmin: false,
  isProgramCreator: false,
};

const APPLICANT_RESPONSE: PermissionsApiResponse = {
  roles: {
    primaryRole: "APPLICANT",
    roles: ["APPLICANT"],
  },
  permissions: [
    "application:view_own",
    "application:create",
    "application:edit_own",
    "milestone:view_own",
    "milestone:submit",
  ],
  resourceContext: {},
  isCommunityAdmin: false,
  isProgramAdmin: false,
  isReviewer: false,
  isRegistryAdmin: false,
  isProgramCreator: false,
};

const GUEST_RESPONSE: PermissionsApiResponse = {
  roles: {
    primaryRole: "GUEST",
    roles: ["GUEST"],
  },
  permissions: [],
  resourceContext: {},
  isCommunityAdmin: false,
  isProgramAdmin: false,
  isReviewer: false,
  isRegistryAdmin: false,
  isProgramCreator: false,
};

const PERMISSIONS_BY_ROLE: Record<string, PermissionsApiResponse> = {
  superAdmin: SUPER_ADMIN_RESPONSE,
  registryAdmin: REGISTRY_ADMIN_RESPONSE,
  communityAdmin: COMMUNITY_ADMIN_RESPONSE,
  programAdmin: PROGRAM_ADMIN_RESPONSE,
  reviewer: PROGRAM_REVIEWER_RESPONSE,
  applicant: APPLICANT_RESPONSE,
  guest: GUEST_RESPONSE,
};

export function getPermissionsResponse(role: string): PermissionsApiResponse {
  const response = PERMISSIONS_BY_ROLE[role];
  if (!response) {
    return structuredClone(GUEST_RESPONSE);
  }
  return structuredClone(response);
}
