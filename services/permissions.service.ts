import axios from "axios";
import { getCookiesFromStoredWallet } from "@/utilities/getCookiesFromStoredWallet";
import { envVars } from "@/utilities/enviromentVars";

const API_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

// Create axios instance with authentication
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor for authentication
apiClient.interceptors.request.use((config) => {
  const { token } = getCookiesFromStoredWallet();
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("Permission API Error:", error.response?.data || error.message);
    throw error;
  }
);

/**
 * Permission check options
 */
export interface PermissionCheckOptions {
  programId?: string;
  chainID?: number;
  action?: string;
  role?: string;
}

/**
 * Permission check response
 */
export interface PermissionCheckResponse {
  hasPermission: boolean;
  permissions: string[];
}

/**
 * User permissions response
 */
export interface UserPermissionsResponse {
  permissions: Array<{
    resource: string;
    actions: string[];
    role?: string;
  }>;
}

/**
 * Reviewer program
 */
export interface ReviewerProgram {
  programId: string;
  chainID: number;
  name?: string;
  assignedAt: string;
  permissions: string[];
}

/**
 * Service for handling permission checks and role management
 */
export const permissionsService = {
  /**
   * Check if a user has permission for a specific action
   */
  async checkPermission(options: PermissionCheckOptions): Promise<PermissionCheckResponse> {
    const { programId, chainID, action } = options;

    if (!programId || !chainID) {
      throw new Error("Program ID and Chain ID are required for permission check");
    }

    const params = new URLSearchParams();
    if (action) {
      params.append("action", action);
    }

    const response = await apiClient.get<PermissionCheckResponse>(
      `/v2/funding-program-configs/${programId}/${chainID}/check-permission?${params.toString()}`
    );

    return response.data;
  },

  /**
   * Get user's permissions for a resource
   */
  async getUserPermissions(resource?: string): Promise<UserPermissionsResponse> {
    const params = new URLSearchParams();
    if (resource) {
      params.append("resource", resource);
    }

    const response = await apiClient.get<UserPermissionsResponse>(
      `/v2/user/permissions?${params.toString()}`
    );

    return response.data;
  },

  /**
   * Get programs where the user is a reviewer
   */
  async getReviewerPrograms(): Promise<{ programs: ReviewerProgram[] }> {
    const response = await apiClient.get<{ programs: ReviewerProgram[] }>(
      "/v2/funding-program-configs/my-reviewer-programs"
    );

    return response.data;
  },

  /**
   * Check if user has a specific role
   */
  async hasRole(role: string, resource?: string): Promise<boolean> {
    if (role === "reviewer" && !resource) {
      // Check if user has any reviewer programs
      const { programs } = await this.getReviewerPrograms();
      return programs.length > 0;
    }

    if (resource) {
      // Check specific resource permission
      const permissions = await this.getUserPermissions(resource);
      return permissions.permissions.some(p => p.role === role && p.resource === resource);
    }

    return false;
  },

  /**
   * Check if user can perform an action on a resource
   */
  async canPerformAction(resource: string, action: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(resource);
    const resourcePermissions = permissions.permissions.find(p => p.resource === resource);
    return resourcePermissions?.actions.includes(action) ?? false;
  },
};