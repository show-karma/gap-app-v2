/**
 * Field configuration for role management
 */
export interface RoleFieldConfig {
  name: string;
  label: string;
  type: "text" | "email" | "wallet";
  placeholder?: string;
  required: boolean;
  helperText?: string;
  validation?: (value: string) => boolean | string;
}

/**
 * Configuration for role management
 */
export interface RoleManagementConfig {
  roleName: string;
  roleDisplayName: string;
  fields: RoleFieldConfig[];
  resource: string;
  canAddMultiple?: boolean;
  maxMembers?: number;
}

/**
 * Reviewer role type
 */
export type ReviewerRole = "program" | "milestone";

/**
 * Role member data
 */
export interface RoleMember {
  id: string;
  publicAddress?: string;
  walletAddress?: string;
  loginEmail?: string;
  notificationEmail?: string;
  name?: string;
  email?: string;
  telegram?: string;
  assignedAt?: string;
  role?: ReviewerRole;
  [key: string]: string | undefined;
}

/**
 * Role option for multi-role support
 */
export interface RoleOption {
  value: string;
  label: string;
  config: RoleManagementConfig;
}
