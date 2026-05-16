import { Role } from "@/src/core/rbac/types";

interface DenialPreset {
  requiredRoles: ReadonlyArray<Role | string>;
  contactLabel: string;
}

function communityContact(communityName?: string | null): string {
  return `a community administrator of ${communityName ?? "this community"}`;
}

export function communityAdminDenial(communityName?: string | null): DenialPreset {
  return {
    requiredRoles: [Role.COMMUNITY_ADMIN, Role.SUPER_ADMIN],
    contactLabel: communityContact(communityName),
  };
}

export function manageLayoutDenial(communityName?: string | null): DenialPreset {
  return {
    requiredRoles: [
      Role.COMMUNITY_ADMIN,
      Role.PROGRAM_ADMIN,
      Role.PROGRAM_REVIEWER,
      Role.REGISTRY_ADMIN,
      "Community Owner",
    ],
    contactLabel: communityContact(communityName),
  };
}

export function milestoneReviewDenial(communityName?: string | null): DenialPreset {
  return {
    requiredRoles: [
      Role.COMMUNITY_ADMIN,
      Role.SUPER_ADMIN,
      Role.PROGRAM_REVIEWER,
      "Contract Owner",
    ],
    contactLabel: communityContact(communityName),
  };
}

export function faucetAdminDenial(): DenialPreset {
  return {
    requiredRoles: [Role.SUPER_ADMIN],
    contactLabel: "the platform team",
  };
}
