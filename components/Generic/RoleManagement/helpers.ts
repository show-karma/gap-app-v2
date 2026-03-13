import type { ReviewerRole, RoleMember } from "./types";

/**
 * Helper utilities for role management
 */

/**
 * Extract the single role from a member object (backward compatibility)
 */
export function getMemberRole(member: RoleMember | undefined | null): ReviewerRole | undefined {
  return member?.role;
}

/**
 * Extract all roles from a member object
 * Falls back to single role field if roles array is not present
 */
export function getMemberRoles(member: RoleMember | undefined | null): ReviewerRole[] {
  if (!member) return [];
  if (member.roles && member.roles.length > 0) return member.roles;
  if (member.role) return [member.role];
  return [];
}

/**
 * Get the display label for a reviewer role
 */
export function getRoleLabel(role: ReviewerRole | undefined): string {
  if (!role) return "";

  return role === "program" ? "Program Reviewer" : "Milestone Reviewer";
}

/**
 * Get the short display label for a reviewer role
 */
export function getRoleShortLabel(role: ReviewerRole | undefined): string {
  if (!role) return "";

  return role === "program" ? "App" : "Milestone";
}
