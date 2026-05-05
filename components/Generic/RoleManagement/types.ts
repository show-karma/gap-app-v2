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
  /**
   * Optional rich content shown in a question-mark tooltip beside the
   * field label. Use for guidance that's too long for `helperText`
   * (which only renders a one-liner under the input). String content
   * is rendered as plain text; JSX content lets you include links or
   * formatting.
   */
  tooltip?: string;
  validation?: (value: string) => boolean | string;
  /**
   * When true, the field is included in the inline edit form for existing
   * members. Email/name are typically not editable; telegram/slack are.
   */
  editable?: boolean;
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
  name: string;
  email: string;
  telegram?: string;
  slack?: string;
  assignedAt?: string;
  role?: ReviewerRole; // Optional single role field for backward compatibility
  roles?: ReviewerRole[]; // Multiple roles for combined view
  [key: string]: string | string[] | undefined; // Additional dynamic fields based on configuration
}

/**
 * Role option for multi-role support
 */
export interface RoleOption {
  value: string;
  label: string;
  config: RoleManagementConfig;
}
