import type { RoleMember, ReviewerRole } from "./types";

/**
 * Helper utilities for role management
 */

/**
 * Extract the role from a member object
 * @param member - The member object to extract role from
 * @returns The role if present, undefined otherwise
 */
export function getMemberRole(
  member: RoleMember | undefined | null,
): ReviewerRole | undefined {
  return member?.role;
}

/**
 * Get the display label for a reviewer role
 * @param role - The role to get the label for
 * @returns The display label for the role
 */
export function getRoleLabel(role: ReviewerRole | undefined): string {
  if (!role) return "";

  return role === "program" ? "Program Reviewer" : "Milestone Reviewer";
}

/**
 * Get the short display label for a reviewer role
 * @param role - The role to get the label for
 * @returns The short display label for the role
 */
export function getRoleShortLabel(role: ReviewerRole | undefined): string {
  if (!role) return "";

  return role === "program" ? "Program" : "Milestone";
}
