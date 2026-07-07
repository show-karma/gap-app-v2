import { Role } from "@/src/core/rbac/types";

interface DenialPreset {
  requiredRoles: ReadonlyArray<Role | string>;
}

export function communityAdminDenial(_communityName?: string | null): DenialPreset {
  return {
    requiredRoles: [Role.COMMUNITY_ADMIN, Role.SUPER_ADMIN],
  };
}

export function manageLayoutDenial(_communityName?: string | null): DenialPreset {
  return {
    requiredRoles: [
      Role.COMMUNITY_ADMIN,
      Role.PROGRAM_ADMIN,
      Role.PROGRAM_REVIEWER,
      Role.REGISTRY_ADMIN,
      "Community Owner",
    ],
  };
}

export function milestoneReviewDenial(_communityName?: string | null): DenialPreset {
  return {
    requiredRoles: [
      Role.COMMUNITY_ADMIN,
      Role.SUPER_ADMIN,
      Role.PROGRAM_REVIEWER,
      "Contract Owner",
    ],
  };
}

export function faucetAdminDenial(): DenialPreset {
  return {
    requiredRoles: [Role.SUPER_ADMIN],
  };
}

export function staffDenial(): DenialPreset {
  return {
    requiredRoles: [Role.SUPER_ADMIN],
  };
}
